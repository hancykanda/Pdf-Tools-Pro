import { NextRequest } from 'next/server';
import { gsConvert } from '@/lib/ghostscript';
import { which } from '@/lib/cli';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Compress PDF — Ghostscript.
 *   gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook ...
 *
 * The radio levels map onto Ghostscript's -dPDFSETTINGS presets:
 *   low    -> /screen   (lowest quality, smallest file)
 *   medium -> /ebook    (balanced, the recommended default)
 *   high   -> /printer  (highest quality, largest file)
 */
const PDF_SETTINGS = {
  low: '/screen',
  medium: '/ebook',
  high: '/printer',
} as const;

type CompressionLevel = keyof typeof PDF_SETTINGS;

function parseLevel(value: unknown): CompressionLevel {
  const raw = typeof value === 'string' ? value.toLowerCase().trim() : '';
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return 'medium';
}

interface Upload {
  buffer: Buffer;
  filename: string;
  level: CompressionLevel;
}

function sanitizeFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() || 'document.pdf').replace(/["\r\n]/g, '');
  return base.trim() || 'document.pdf';
}

function base64ToBuffer(value: string): Buffer {
  const clean = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  return Buffer.from(clean, 'base64');
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
      level: parseLevel(formData.get('level') ?? formData.get('compression')),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: 'Invalid request body' };
  }

  const { file, filename, level, compression } = (body || {}) as {
    file?: unknown;
    filename?: unknown;
    level?: unknown;
    compression?: unknown;
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
    level: parseLevel(level ?? compression),
  };
}

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('latin1').startsWith('%PDF-');
}

function outputName(filename: string): string {
  const stem = filename.replace(/\.pdf$/i, '') || 'document';
  return `${stem}-compressed.pdf`;
}

export async function POST(request: NextRequest) {
  try {
    const upload = await readUpload(request);
    if ('error' in upload) {
      return Response.json({ error: upload.error }, { status: 400 });
    }

    const { buffer, filename, level } = upload;

    if (!isPdf(buffer)) {
      return Response.json({ error: 'The uploaded file is not a valid PDF' }, { status: 400 });
    }

    if (!which('gs')) {
      return Response.json(
        { error: 'Ghostscript (gs) is not installed on the server, so PDFs cannot be compressed.' },
        { status: 503 },
      );
    }

    const settings = PDF_SETTINGS[level];

    let compressed: Buffer;
    try {
      compressed = await gsConvert(buffer, 'pdf', { settings, timeoutMs: 240_000 });
    } catch (error) {
      console.error('Compress (ghostscript) error:', error);
      return Response.json(
        { error: 'Ghostscript could not compress this PDF. The file may be damaged or password protected.' },
        { status: 422 },
      );
    }

    // Ghostscript occasionally produces a *larger* file (already-optimised or
    // image-light documents). Never hand the user a bigger file than they gave us.
    const grew = compressed.length >= buffer.length;
    const output = grew ? buffer : compressed;

    const body = new Uint8Array(output);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName(filename)}"`,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'no-store',
        'X-Original-Size': String(buffer.length),
        'X-Compressed-Size': String(output.length),
        'X-Compression-Level': level,
        'X-Pdf-Settings': settings,
        'X-Compression-Applied': grew ? 'false' : 'true',
      },
    });
  } catch (error) {
    console.error('Compress error:', error);
    return Response.json({ error: 'Failed to compress PDF' }, { status: 500 });
  }
}
