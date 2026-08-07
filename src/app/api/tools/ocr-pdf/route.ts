import { NextRequest } from 'next/server';
import { ocrPdf } from '@/lib/ocr';
import { runCommand, which } from '@/lib/cli';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600;

/**
 * OCR PDF — ocrmypdf (which wraps Tesseract).
 *   ocrmypdf --skip-text -l eng in.pdf out.pdf
 *
 * `--skip-text` means pages that already carry a text layer are passed through
 * untouched instead of erroring out, so the tool is safe for mixed documents.
 */

/**
 * Languages offered in the UI dropdown -> Tesseract traineddata codes.
 * Kept local: `route.ts` may only export HTTP handlers + route segment config.
 */
const OCR_LANGUAGES: { code: string; label: string }[] = [
  { code: 'eng', label: 'English' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'nld', label: 'Dutch' },
  { code: 'rus', label: 'Russian' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'ara', label: 'Arabic' },
];

const LANGUAGE_CODES = new Set(OCR_LANGUAGES.map((l) => l.code));

let installedCache: { at: number; codes: string[] } | null = null;

/** Ask Tesseract which traineddata packs are actually present on this machine. */
async function installedLanguages(): Promise<string[]> {
  if (installedCache && Date.now() - installedCache.at < 60_000) return installedCache.codes;

  const tesseract = which('tesseract');
  if (!tesseract) {
    installedCache = { at: Date.now(), codes: [] };
    return [];
  }

  try {
    const res = await runCommand(tesseract, ['--list-langs'], { timeoutMs: 15_000 });
    const codes = `${res.stdout}\n${res.stderr}`
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^[A-Za-z0-9_]+$/.test(line) && line !== 'osd');
    installedCache = { at: Date.now(), codes };
    return codes;
  } catch {
    installedCache = { at: Date.now(), codes: [] };
    return [];
  }
}

interface Upload {
  buffer: Buffer;
  filename: string;
  lang: string;
}

function sanitizeFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() || 'document.pdf').replace(/["\r\n]/g, '');
  return base.trim() || 'document.pdf';
}

function base64ToBuffer(value: string): Buffer {
  const clean = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  return Buffer.from(clean, 'base64');
}

/** Only ever hand a known-good, allow-listed code to the CLI. */
function parseLang(value: unknown): string {
  const raw = typeof value === 'string' ? value.toLowerCase().trim() : '';
  return LANGUAGE_CODES.has(raw) ? raw : 'eng';
}

async function readUpload(request: NextRequest): Promise<Upload | { error: string }> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const entry = formData.get('file');
    if (!(entry instanceof File) || entry.size === 0) {
      return { error: 'PDF file is required' };
    }
    return {
      buffer: Buffer.from(await entry.arrayBuffer()),
      filename: sanitizeFilename(entry.name || 'document.pdf'),
      lang: parseLang(formData.get('lang') ?? formData.get('language')),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: 'Invalid request body' };
  }

  const { file, filename, lang, language } = (body || {}) as {
    file?: unknown;
    filename?: unknown;
    lang?: unknown;
    language?: unknown;
  };

  if (typeof file !== 'string' || file.length === 0) {
    return { error: 'PDF file is required' };
  }

  let buffer: Buffer;
  try {
    buffer = base64ToBuffer(file);
  } catch {
    return { error: 'Could not decode the uploaded PDF' };
  }

  if (buffer.length === 0) return { error: 'The uploaded PDF is empty' };

  return {
    buffer,
    filename: sanitizeFilename(typeof filename === 'string' && filename ? filename : 'document.pdf'),
    lang: parseLang(lang ?? language),
  };
}

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('latin1').startsWith('%PDF-');
}

function outputName(filename: string): string {
  const stem = filename.replace(/\.pdf$/i, '') || 'document';
  return `${stem}-ocr.pdf`;
}

/** Advertise the language dropdown options and whether each pack is installed. */
export async function GET() {
  const installed = await installedLanguages();
  const available = new Set(installed);

  return Response.json(
    {
      engine: which('ocrmypdf') ? 'ocrmypdf' : null,
      languages: OCR_LANGUAGES.map((l) => ({ ...l, available: available.has(l.code) })),
      installed,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const upload = await readUpload(request);
    if ('error' in upload) {
      return Response.json({ error: upload.error }, { status: 400 });
    }

    const { buffer, filename, lang } = upload;

    if (!isPdf(buffer)) {
      return Response.json({ error: 'The uploaded file is not a valid PDF' }, { status: 400 });
    }

    if (!which('ocrmypdf')) {
      return Response.json(
        { error: 'The OCR engine (ocrmypdf) is not installed on the server.' },
        { status: 503 },
      );
    }

    const installed = await installedLanguages();
    if (installed.length > 0 && !installed.includes(lang)) {
      const label = OCR_LANGUAGES.find((l) => l.code === lang)?.label || lang;
      return Response.json(
        {
          error: `The ${label} (${lang}) language pack is not installed on this server. Installed: ${installed.join(', ')}.`,
        },
        { status: 400 },
      );
    }

    let searchable: Buffer;
    try {
      searchable = await ocrPdf(buffer, lang, { timeoutMs: 540_000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('OCR (ocrmypdf) error:', message);

      if (/encrypted|password/i.test(message)) {
        return Response.json(
          { error: 'This PDF is password protected. Unlock it before running OCR.' },
          { status: 422 },
        );
      }
      if (/not installed|failed loading language|Error opening data file/i.test(message)) {
        return Response.json(
          { error: `The "${lang}" Tesseract language pack is missing on the server.` },
          { status: 400 },
        );
      }
      return Response.json(
        { error: 'OCR failed for this PDF. It may be damaged or in an unsupported format.' },
        { status: 422 },
      );
    }

    const body = new Uint8Array(searchable);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName(filename)}"`,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'no-store',
        'X-Ocr-Language': lang,
        'X-Original-Size': String(buffer.length),
        'X-Output-Size': String(searchable.length),
      },
    });
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json({ error: 'Failed to process OCR request' }, { status: 500 });
  }
}
