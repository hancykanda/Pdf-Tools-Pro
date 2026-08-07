/**
 * PDF → Office conversions (the "Convert from PDF" tool family).
 *
 * Two engines are available for Word output:
 *  - `pdf2docx` (PyMuPDF based): rebuilds tables/positioned frames, so it is
 *    the better choice when the user wants the layout preserved;
 *  - LibreOffice headless with the Writer PDF import filter: produces a plain,
 *    flowing document that is easier to edit.
 *
 * PowerPoint output always goes through LibreOffice: the PDF is imported into
 * Impress (`impress_pdf_import`) and exported with the pptx filter.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { makeTempDir, runCommand, which } from './cli';

export class OfficeConvertError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'OfficeConvertError';
    this.status = status;
  }
}

/** Locate the LibreOffice binary (`soffice` preferred, `libreoffice` fallback). */
export function findSofficeBin(): string | null {
  return which('soffice') ?? which('libreoffice');
}

/** Locate the `pdf2docx` CLI, if the Python package is installed. */
export function findPdf2Docx(): string | null {
  return which('pdf2docx');
}

/** Common `soffice --headless` flags, with a throw-away user profile. */
function sofficeBaseArgs(profileDir: string): string[] {
  return [
    '--headless',
    '--norestore',
    '--nofirststartwizard',
    '--nologo',
    '--nolockcheck',
    '--nodefault',
    `-env:UserInstallation=file://${profileDir}`,
  ];
}

interface SofficeRun {
  /** LibreOffice import filter, e.g. "writer_pdf_import". */
  infilter: string;
  /** `--convert-to` value, e.g. "docx:Office Open XML Text". */
  convertTo: string;
  /** Expected output extension ("docx" | "pptx"). */
  outExt: string;
  timeoutMs?: number;
}

/** Run one headless LibreOffice PDF import + export and return the output bytes. */
async function sofficeConvertPdf(
  pdf: Buffer,
  { infilter, convertTo, outExt, timeoutMs = 180_000 }: SofficeRun,
): Promise<Buffer> {
  const soffice = findSofficeBin();
  if (!soffice) {
    throw new OfficeConvertError(
      'LibreOffice is not installed on the server, so this conversion is unavailable.',
      503,
    );
  }

  const { dir, cleanup } = makeTempDir('lo-frompdf-');
  try {
    const inputPath = join(dir, 'input.pdf');
    const outDir = join(dir, 'out');
    const profileDir = join(dir, 'profile');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(inputPath, pdf);

    const args = [
      ...sofficeBaseArgs(profileDir),
      `--infilter=${infilter}`,
      '--convert-to',
      convertTo,
      '--outdir',
      outDir,
      inputPath,
    ];

    const { code, stdout, stderr } = await runCommand(soffice, args, { timeoutMs });

    const expected = join(outDir, `input.${outExt}`);
    let outPath: string | null = existsSync(expected) ? expected : null;
    if (!outPath) {
      const produced = readdirSync(outDir).find((n) => n.toLowerCase().endsWith(`.${outExt}`));
      if (produced) outPath = join(outDir, produced);
    }

    if (!outPath) {
      // soffice exits 0 even when it cannot load the document.
      const detail = `${stdout} ${stderr}`.trim();
      if (/source file could not be loaded|no export filter/i.test(detail)) {
        throw new OfficeConvertError(
          'LibreOffice could not convert this PDF. It may be corrupted, password protected, or image-only.',
          422,
        );
      }
      throw new OfficeConvertError(
        `LibreOffice conversion failed (exit ${code}). ${detail.slice(0, 400)}`.trim(),
      );
    }

    const out = readFileSync(outPath);
    if (out.length === 0 || out.subarray(0, 2).toString('latin1') !== 'PK') {
      throw new OfficeConvertError('LibreOffice produced an invalid Office file.');
    }
    return out;
  } finally {
    cleanup();
  }
}

/**
 * PDF → .docx with LibreOffice (Writer PDF import).
 * Text becomes real, editable paragraphs rather than a Draw canvas.
 */
export function pdfToDocxLibreOffice(pdf: Buffer, timeoutMs?: number): Promise<Buffer> {
  return sofficeConvertPdf(pdf, {
    infilter: 'writer_pdf_import',
    convertTo: 'docx:Office Open XML Text',
    outExt: 'docx',
    timeoutMs,
  });
}

/** PDF → .pptx with LibreOffice (Impress PDF import, one slide per page). */
export function pdfToPptxLibreOffice(pdf: Buffer, timeoutMs?: number): Promise<Buffer> {
  return sofficeConvertPdf(pdf, {
    infilter: 'impress_pdf_import',
    convertTo: 'pptx:Impress MS PowerPoint 2007 XML',
    outExt: 'pptx',
    timeoutMs,
  });
}

/**
 * PDF → .docx with `pdf2docx`, which reconstructs tables and uses positioned
 * frames so the original layout survives the round trip.
 */
export async function pdfToDocxPdf2Docx(pdf: Buffer, timeoutMs = 240_000): Promise<Buffer> {
  const bin = findPdf2Docx();
  if (!bin) {
    throw new OfficeConvertError('pdf2docx is not installed on the server.', 503);
  }

  const { dir, cleanup } = makeTempDir('pdf2docx-');
  try {
    const inputPath = join(dir, 'input.pdf');
    const outputPath = join(dir, 'output.docx');
    writeFileSync(inputPath, pdf);

    const { code, stdout, stderr } = await runCommand(bin, ['convert', inputPath, outputPath], {
      timeoutMs,
      cwd: dir,
    });

    if (!existsSync(outputPath)) {
      const detail = `${stdout} ${stderr}`.trim();
      throw new OfficeConvertError(
        `pdf2docx conversion failed (exit ${code}). ${detail.slice(-400)}`.trim(),
      );
    }

    const out = readFileSync(outputPath);
    if (out.length === 0 || out.subarray(0, 2).toString('latin1') !== 'PK') {
      throw new OfficeConvertError('pdf2docx produced an invalid .docx file.');
    }
    return out;
  } finally {
    cleanup();
  }
}

/**
 * PDF → .docx honouring the UI toggle.
 *  - "layout": pdf2docx when available, LibreOffice as a fallback;
 *  - "text":   LibreOffice Writer import (flowing, easiest to edit).
 */
export async function pdfToDocx(
  pdf: Buffer,
  mode: 'layout' | 'text' = 'layout',
): Promise<{ docx: Buffer; engine: 'pdf2docx' | 'libreoffice' }> {
  if (mode === 'layout' && findPdf2Docx()) {
    try {
      return { docx: await pdfToDocxPdf2Docx(pdf), engine: 'pdf2docx' };
    } catch (err) {
      // Fall through to LibreOffice so the user still gets a document.
      console.warn('pdf2docx failed, falling back to LibreOffice:', err);
    }
  }
  return { docx: await pdfToDocxLibreOffice(pdf), engine: 'libreoffice' };
}

/** Strip path separators/quotes from a download filename. */
export function safeBaseName(original: string, fallback: string): string {
  const base = (original || '').replace(/\.[^/.]+$/, '').trim();
  const safe = base.replace(/[\r\n"\\/]+/g, '').slice(0, 120);
  return safe || fallback;
}
