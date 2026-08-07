import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { runCommand, makeTempDir, which } from './cli';

const GS = which('gs') || 'gs';

export interface GsOptions {
  settings?: string; // e.g. "/ebook" for -dPDFSETTINGS
  device?: string; // e.g. "pdfwrite"
  extraArgs?: string[];
  /**
   * Extra PostScript/PDF files fed to Ghostscript *before* the input PDF but
   * *after* -sOutputFile (used for pdfmark prologues such as PDFA_def.ps).
   */
  preInputFiles?: string[];
  timeoutMs?: number;
}

/** Convert/process a PDF with Ghostscript. Returns output bytes. */
export async function gsConvert(
  inputPdf: Buffer,
  outExt = 'pdf',
  opts: GsOptions = {},
): Promise<Buffer> {
  const { dir, cleanup } = makeTempDir('gs-');
  try {
    const inPath = `${dir}/in.pdf`;
    const outPath = `${dir}/out.${outExt}`;
    writeFileSync(inPath, inputPdf);
    const args = [
      '-q',
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      `-sDEVICE=${opts.device || 'pdfwrite'}`,
    ];
    if (opts.settings) args.push(`-dPDFSETTINGS=${opts.settings}`);
    args.push(...(opts.extraArgs || []));
    args.push(`-sOutputFile=${outPath}`, ...(opts.preInputFiles || []), inPath);
    const res = await runCommand(GS, args, { timeoutMs: opts.timeoutMs || 120000 });
    if (res.code !== 0 || !existsSync(outPath)) {
      throw new Error(`Ghostscript failed (exit ${res.code}): ${res.stderr.slice(0, 400)}`);
    }
    return readFileSync(outPath);
  } finally {
    cleanup();
  }
}

/** Repair a PDF via Ghostscript reprocessing. */
export async function gsRepair(inputPdf: Buffer): Promise<Buffer> {
  return gsConvert(inputPdf, 'pdf', { extraArgs: ['-dPDFSETTINGS=/prepress'] });
}

export type PdfAConformance = 'PDF/A-1b' | 'PDF/A-2b' | 'PDF/A-3b';

/** Candidate sRGB ICC profiles shipped by Ghostscript / colord on Linux. */
const ICC_CANDIDATES = [
  '/usr/share/color/icc/ghostscript/srgb.icc',
  '/usr/share/color/icc/sRGB.icc',
  '/usr/share/color/icc/colord/sRGB.icc',
  '/usr/share/ghostscript/iccprofiles/srgb.icc',
];

/** First sRGB ICC profile available on this machine, or null when none exists. */
export function findSrgbIccProfile(): string | null {
  return ICC_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

/**
 * Build the PDFA_def.ps pdfmark prologue that attaches an sRGB OutputIntent —
 * required for a file to actually claim PDF/A conformance.
 */
function buildPdfaDef(iccPath: string, title: string): string {
  const safeTitle = title.replace(/[\\()]/g, '').slice(0, 120) || 'Archived Document';
  return `%!
[ /Title (${safeTitle}) /DOCINFO pdfmark
/ICCProfile (${iccPath}) def
[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark
[{icc_PDFA} << /N 3 >> /PUT pdfmark
[{icc_PDFA} ICCProfile (r) file /PUT pdfmark
[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark
[{OutputIntent_PDFA} <<
  /Type /OutputIntent
  /S /GTS_PDFA1
  /DestOutputProfile {icc_PDFA}
  /OutputConditionIdentifier (sRGB)
>> /PUT pdfmark
[{Catalog} <</OutputIntents [ {OutputIntent_PDFA} ]>> /PUT pdfmark
`;
}

/**
 * Convert a PDF to PDF/A ("PDF/A-1b" | "PDF/A-2b" | "PDF/A-3b") with Ghostscript.
 *
 * When an sRGB ICC profile is present we also embed a GTS_PDFA1 OutputIntent
 * (via a generated PDFA_def.ps prologue), which is what real validators check.
 * Without a profile the conversion still runs and emits a PDF/A-flavoured file
 * (correct pdfaid XMP metadata, no OutputIntent).
 */
export async function gsPdfA(
  inputPdf: Buffer,
  conformance: PdfAConformance = 'PDF/A-2b',
  opts: { title?: string; timeoutMs?: number } = {},
): Promise<Buffer> {
  const level = conformance.startsWith('PDF/A-1') ? 1 : conformance.startsWith('PDF/A-3') ? 3 : 2;
  const icc = findSrgbIccProfile();

  const extraArgs = [
    `-dPDFA=${level}`,
    '-dPDFACompatibilityPolicy=1',
    '-dNOOUTERSAVE',
    '-dCompatibilityLevel=' + (level === 1 ? '1.4' : level === 3 ? '1.7' : '1.7'),
  ];

  if (!icc) {
    return gsConvert(inputPdf, 'pdf', {
      device: 'pdfwrite',
      extraArgs,
      timeoutMs: opts.timeoutMs,
    });
  }

  // -dSAFER (on by default in gs 10) blocks the prologue from opening the
  // profile, so the path has to be whitelisted explicitly.
  extraArgs.push(
    `--permit-file-read=${icc}`,
    '-sColorConversionStrategy=RGB',
    `-sOutputICCProfile=${icc}`,
  );

  const { dir, cleanup } = makeTempDir('gs-pdfa-');
  try {
    const defPath = `${dir}/PDFA_def.ps`;
    writeFileSync(defPath, buildPdfaDef(icc, opts.title || 'Archived Document'));
    return await gsConvert(inputPdf, 'pdf', {
      device: 'pdfwrite',
      extraArgs,
      preInputFiles: [defPath],
      timeoutMs: opts.timeoutMs,
    });
  } finally {
    cleanup();
  }
}
