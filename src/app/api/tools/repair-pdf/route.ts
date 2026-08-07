import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { gsRepair } from '@/lib/ghostscript';
import { makeTempDir, runCommand, which } from '@/lib/cli';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Repair PDF — Ghostscript reprocess, with qpdf as the fallback engine.
 *
 *   gs -sDEVICE=pdfwrite ...                  rebuilds the entire file
 *   qpdf --recompress-flate ... in.pdf out.pdf  reconstructs the xref / objects
 *
 * Ghostscript is tried first, but it is not trustworthy on its own here: when a
 * file is badly damaged it still exits 0 while emitting an empty one-page PDF.
 * The output is therefore page-count checked against the input, and qpdf (which
 * reconstructs broken cross-reference tables) takes over when it looks degraded.
 */

interface Upload {
  buffer: Buffer;
  filename: string;
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
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: 'Invalid request body' };
  }

  const { file, filename } = (body || {}) as { file?: unknown; filename?: unknown };
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
  };
}

/**
 * Best-effort page count that tolerates damage: pdf-lib first (in-process), then
 * `qpdf --show-npages`, which rebuilds the xref table before counting.
 * Returns null when neither engine can make sense of the bytes.
 */
async function probePageCount(pdf: Buffer): Promise<number | null> {
  try {
    const doc = await PDFDocument.load(pdf, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });
    const count = doc.getPageCount();
    if (count > 0) return count;
  } catch {
    // fall through to qpdf
  }

  const qpdf = which('qpdf');
  if (!qpdf) return null;

  const { dir, cleanup } = makeTempDir('qpdf-probe-');
  try {
    const inPath = `${dir}/in.pdf`;
    writeFileSync(inPath, pdf);
    // exit 3 == "succeeded with warnings", which is normal for a damaged file.
    const res = await runCommand(qpdf, ['--show-npages', inPath], { timeoutMs: 60_000 });
    if (res.code !== 0 && res.code !== 3) return null;
    const count = parseInt(res.stdout.trim(), 10);
    return Number.isFinite(count) && count > 0 ? count : null;
  } catch {
    return null;
  } finally {
    cleanup();
  }
}

/** Fallback repair: qpdf reconstructs the cross-reference table and recompresses streams. */
async function qpdfRepair(inputPdf: Buffer): Promise<Buffer> {
  const qpdf = which('qpdf');
  if (!qpdf) throw new Error('qpdf is not installed');

  const { dir, cleanup } = makeTempDir('qpdf-repair-');
  try {
    const inPath = `${dir}/in.pdf`;
    const outPath = `${dir}/out.pdf`;
    writeFileSync(inPath, inputPdf);
    const res = await runCommand(
      qpdf,
      ['--recompress-flate', '--object-streams=generate', '--stream-data=compress', inPath, outPath],
      { timeoutMs: 180_000 },
    );
    const produced = existsSync(outPath) && statSync(outPath).size > 0;
    if (!produced || (res.code !== 0 && res.code !== 3)) {
      throw new Error(`qpdf failed (exit ${res.code}): ${res.stderr.slice(0, 400)}`);
    }
    return readFileSync(outPath);
  } finally {
    cleanup();
  }
}

function outputName(filename: string): string {
  const stem = filename.replace(/\.pdf$/i, '') || 'document';
  return `${stem}-repaired.pdf`;
}

export async function POST(request: NextRequest) {
  try {
    const upload = await readUpload(request);
    if ('error' in upload) {
      return Response.json({ error: upload.error }, { status: 400 });
    }

    const { buffer, filename } = upload;

    const hasGs = Boolean(which('gs'));
    const hasQpdf = Boolean(which('qpdf'));
    if (!hasGs && !hasQpdf) {
      return Response.json(
        { error: 'Neither Ghostscript nor qpdf is installed on the server, so PDFs cannot be repaired.' },
        { status: 503 },
      );
    }

    const expectedPages = await probePageCount(buffer);
    const failures: string[] = [];

    const candidates: { method: string; bytes: Buffer; pages: number }[] = [];

    if (hasGs) {
      try {
        const bytes = await gsRepair(buffer);
        const pages = (await probePageCount(bytes)) ?? 0;
        if (bytes.length > 0 && pages > 0) candidates.push({ method: 'ghostscript', bytes, pages });
        else failures.push('ghostscript: produced an empty document');
      } catch (error) {
        failures.push(`ghostscript: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const gsCandidate = candidates[0];
    const gsGoodEnough =
      gsCandidate && (expectedPages === null || gsCandidate.pages >= expectedPages);

    // Ghostscript can silently drop content on badly damaged files, so verify
    // against the source page count before trusting it.
    if (!gsGoodEnough && hasQpdf) {
      try {
        const bytes = await qpdfRepair(buffer);
        const pages = (await probePageCount(bytes)) ?? 0;
        if (bytes.length > 0 && pages > 0) candidates.push({ method: 'qpdf', bytes, pages });
        else failures.push('qpdf: produced an empty document');
      } catch (error) {
        failures.push(`qpdf: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (candidates.length === 0) {
      console.error('Repair error:', failures.join(' | '));
      return Response.json(
        { error: 'Failed to repair PDF. The file may be too damaged to recover.' },
        { status: 422 },
      );
    }

    // Keep whichever engine recovered the most pages (Ghostscript wins ties).
    const best = candidates.reduce((a, b) => (b.pages > a.pages ? b : a));

    if (failures.length > 0) {
      console.warn('Repair fallback used:', failures.join(' | '));
    }

    const body = new Uint8Array(best.bytes);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName(filename)}"`,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'no-store',
        'X-Repair-Method': best.method,
        'X-Page-Count': String(best.pages),
        'X-Original-Size': String(buffer.length),
        'X-Repaired-Size': String(best.bytes.length),
      },
    });
  } catch (error) {
    console.error('Repair error:', error);
    return Response.json({ error: 'Failed to repair PDF' }, { status: 500 });
  }
}
