import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { makeTempDir, runCommand, which } from './cli';

/**
 * Shared helpers for driving LibreOffice in headless mode
 * (`soffice --headless --convert-to pdf ...`).
 *
 * LibreOffice is deliberately quirky:
 *  - it exits with code 0 even when the conversion fails, so the only reliable
 *    success signal is "did the output file appear?";
 *  - concurrent runs fight over the shared user profile, so every run gets its
 *    own throw-away `-env:UserInstallation` directory.
 */

export type OfficeFamily = 'writer' | 'calc' | 'impress' | 'draw';

/** Export filter LibreOffice must use for each document family. */
const PDF_EXPORT_FILTER: Record<OfficeFamily, string> = {
  writer: 'pdf:writer_pdf_Export',
  calc: 'pdf:calc_pdf_Export',
  impress: 'pdf:impress_pdf_Export',
  draw: 'pdf:draw_pdf_Export',
};

/** Which LibreOffice module owns a given input extension. */
const EXTENSION_FAMILY: Record<string, OfficeFamily> = {
  // Writer
  doc: 'writer',
  docx: 'writer',
  docm: 'writer',
  dot: 'writer',
  dotx: 'writer',
  odt: 'writer',
  ott: 'writer',
  rtf: 'writer',
  txt: 'writer',
  // Calc
  xls: 'calc',
  xlsx: 'calc',
  xlsm: 'calc',
  xlt: 'calc',
  xltx: 'calc',
  ods: 'calc',
  ots: 'calc',
  csv: 'calc',
  tsv: 'calc',
  // Impress
  ppt: 'impress',
  pptx: 'impress',
  pptm: 'impress',
  pps: 'impress',
  ppsx: 'impress',
  pot: 'impress',
  potx: 'impress',
  odp: 'impress',
  otp: 'impress',
};

/** Human label used in error messages. */
const FAMILY_PACKAGE: Record<OfficeFamily, string> = {
  writer: 'libreoffice-writer',
  calc: 'libreoffice-calc',
  impress: 'libreoffice-impress',
  draw: 'libreoffice-draw',
};

export class LibreOfficeError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'LibreOfficeError';
    this.status = status;
  }
}

/** Locate the LibreOffice binary (`soffice` preferred, `libreoffice` fallback). */
export function findSoffice(): string | null {
  return which('soffice') ?? which('libreoffice');
}

/** Normalised, lower-case extension without the leading dot. */
export function fileExtension(filename: string): string {
  return extname(filename || '').toLowerCase().replace(/^\./, '');
}

/** Map an input extension to its LibreOffice module, or null when unsupported. */
export function familyForExtension(ext: string): OfficeFamily | null {
  return EXTENSION_FAMILY[ext] ?? null;
}

export interface ConvertToPdfOptions {
  /** Original filename — only the extension matters. */
  filename: string;
  /** Hard limit for the soffice process (default 2 minutes). */
  timeoutMs?: number;
}

/**
 * Convert an office document buffer to PDF bytes using headless LibreOffice.
 *
 * Runs `soffice --headless --convert-to pdf:<family>_pdf_Export` in a private
 * temp dir with a private user profile, then reads back the produced PDF.
 */
export async function convertOfficeToPdf(
  input: Buffer,
  { filename, timeoutMs = 120_000 }: ConvertToPdfOptions,
): Promise<Buffer> {
  const ext = fileExtension(filename);
  const family = familyForExtension(ext);

  if (!family) {
    throw new LibreOfficeError(
      `Unsupported file type${ext ? ` ".${ext}"` : ''}. Please upload a supported office document.`,
      400,
    );
  }

  const soffice = findSoffice();
  if (!soffice) {
    throw new LibreOfficeError(
      'LibreOffice is not installed on the server, so this conversion is unavailable.',
      503,
    );
  }

  const { dir, cleanup } = makeTempDir('lo-topdf-');

  try {
    const baseName = safeBaseName(filename);
    const inputPath = join(dir, `${baseName}.${ext}`);
    const outDir = join(dir, 'out');
    // A unique profile dir prevents "lock file" conflicts when several
    // conversions run at the same time on the same machine.
    const profileDir = join(dir, 'profile');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(inputPath, input);

    const args = [
      '--headless',
      '--norestore',
      '--nofirststartwizard',
      '--nologo',
      '--nolockcheck',
      '--nodefault',
      `-env:UserInstallation=file://${profileDir}`,
    ];

    // Plain-text inputs need an explicit import filter, otherwise LibreOffice
    // guesses (and CSV would open in Writer instead of Calc).
    if (ext === 'csv') args.push('--infilter=CSV:44,34,76,1');
    else if (ext === 'tsv') args.push('--infilter=CSV:9,34,76,1');

    args.push(
      '--convert-to',
      PDF_EXPORT_FILTER[family],
      '--outdir',
      outDir,
      inputPath,
    );

    const { code, stdout, stderr } = await runCommand(soffice, args, { timeoutMs });

    const expected = join(outDir, `${baseName}.pdf`);
    let pdfPath: string | null = existsSync(expected) ? expected : null;

    if (!pdfPath) {
      // Fall back to whatever PDF landed in the output dir.
      const produced = readdirSync(outDir).find((name) => name.toLowerCase().endsWith('.pdf'));
      if (produced) pdfPath = join(outDir, produced);
    }

    if (!pdfPath) {
      // `soffice` exits 0 even when it cannot load the document, so surface the
      // most useful hint we have.
      const detail = `${stdout} ${stderr}`.trim();
      if (/source file could not be loaded/i.test(detail)) {
        throw new LibreOfficeError(
          `LibreOffice could not open this document. It may be corrupted, password protected, or the ${FAMILY_PACKAGE[family]} module may be missing on the server.`,
          422,
        );
      }
      throw new LibreOfficeError(
        `LibreOffice conversion failed (exit ${code}). ${detail.slice(0, 400)}`.trim(),
      );
    }

    const pdf = readFileSync(pdfPath);
    if (pdf.length === 0 || pdf.subarray(0, 4).toString('latin1') !== '%PDF') {
      throw new LibreOfficeError('LibreOffice produced an invalid PDF file.');
    }

    return pdf;
  } finally {
    cleanup();
  }
}

/** Swap a filename's extension for `.pdf` (used for the download name). */
export function pdfFilenameFor(original: string, fallback: string): string {
  const base = (original || '').replace(/\.[^/.]+$/, '').trim();
  const safe = base.replace(/[\r\n"\\]/g, '').slice(0, 120);
  return `${safe || fallback}.pdf`;
}

/**
 * Filesystem-safe base name for the temp input file.
 *
 * Calc and Impress print the document name in headers/footers, so keeping the
 * user's original name (instead of a generic "input") avoids leaking our temp
 * file naming into the produced PDF.
 */
function safeBaseName(filename: string): string {
  const base = (filename || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^/.]+$/, '')
    // Strip path separators, quotes and control characters.
    .replace(/[\u0000-\u001F<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return base || 'document';
}
