import { NextRequest } from 'next/server';
import { extractPages, getPageCount, splitIntoParts, zipFiles } from '@/lib/pdfPages';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

/**
 * Extract (keep) selected pages from a PDF.
 *
 * Body (JSON):
 *   file      base64 / data-URL of the source PDF (required)
 *   pages     number[] of 1-based page numbers to keep (required)
 *   separate  when true, each kept page becomes its own PDF (zipped)
 *   filename  original filename, used to name the output
 *
 * Response: { dataUrl, filename, mimeType, pageCount, partCount, parts }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, pages, separate, filename } = body ?? {};

    if (!file || typeof file !== 'string') {
      return Response.json({ error: 'A PDF file is required' }, { status: 400 });
    }

    const selected = (Array.isArray(pages) ? pages : [])
      .map((p: unknown) => Number(p))
      .filter((p: number) => Number.isInteger(p) && p >= 1);

    if (selected.length === 0) {
      return Response.json({ error: 'Select at least one page to extract' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);

    let total: number;
    try {
      total = await getPageCount(bytes);
    } catch {
      return Response.json({ error: 'Could not read the PDF file' }, { status: 400 });
    }

    const unique = [...new Set(selected.filter((p) => p <= total))].sort((a, b) => a - b);
    if (unique.length === 0) {
      return Response.json({ error: 'The selected pages are outside this document' }, { status: 400 });
    }

    const safeBase =
      (typeof filename === 'string' ? filename : '').replace(/\.pdf$/i, '').replace(/[^\w.\-]+/g, '_') || 'document';

    if (separate && unique.length > 1) {
      const parts = await splitIntoParts(
        bytes,
        unique.map((page) => ({ name: `page-${page}`, pages: [page] })),
        safeBase
      );
      const zipped = await zipFiles(parts);

      return Response.json({
        dataUrl: bytesToBase64(zipped, 'application/zip'),
        filename: `${safeBase}-extracted.zip`,
        mimeType: 'application/zip',
        pageCount: unique.length,
        partCount: parts.length,
        parts: parts.map((p) => p.name),
      });
    }

    const out = await extractPages(bytes, unique);

    return Response.json({
      dataUrl: bytesToBase64(out),
      filename: `${safeBase}-extracted.pdf`,
      mimeType: 'application/pdf',
      pageCount: unique.length,
      partCount: 1,
      parts: [`${safeBase}-extracted.pdf`],
    });
  } catch (error) {
    console.error('Extract pages error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract pages';
    return Response.json({ error: message }, { status: 500 });
  }
}
