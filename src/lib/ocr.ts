import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { runCommand, makeTempDir, which } from './cli';

const OCRMYPDF = which('ocrmypdf') || 'ocrmypdf';

/**
 * Run ocrmypdf to add a text layer to a scanned PDF.
 * Returns the searchable PDF bytes. `lang` defaults to "eng".
 */
export async function ocrPdf(
  inputPdf: Buffer,
  lang = 'eng',
  opts: { extraArgs?: string[]; timeoutMs?: number } = {},
): Promise<Buffer> {
  const { dir, cleanup } = makeTempDir('ocr-');
  try {
    const inPath = `${dir}/in.pdf`;
    const outPath = `${dir}/out.pdf`;
    writeFileSync(inPath, inputPdf);
    const args = ['--skip-text', '-l', lang, '--output-type', 'pdf'];
    args.push(...(opts.extraArgs || []));
    args.push(inPath, outPath);
    const res = await runCommand(OCRMYPDF, args, {
      timeoutMs: opts.timeoutMs || 300000,
    });
    if (res.code !== 0 || !existsSync(outPath)) {
      throw new Error(`ocrmypdf failed (exit ${res.code}): ${res.stderr.slice(0, 400)}`);
    }
    return readFileSync(outPath);
  } finally {
    cleanup();
  }
}
