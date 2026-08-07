import { NextRequest } from 'next/server';
import { getPageCount, removePages } from '@/lib/pdfPages';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

/**
 * Remove pages from a PDF.
 *
 * Body (JSON):
 *   file      base64 / data-URL of the source PDF (required)
 *   pages     number[] of 1-based page numbers to delete (required)
 *   filename  original filename, used to name the output
 *
 * Response: { dataUrl, filename, mimeType, pageCount, removedCount }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, pages, filename } = body ?? {};

    if (!file || typeof file !== 'string') {
      return Response.json({ error: 'A PDF file is required' }, { status: 400 });
    }

    const selected = (Array.isArray(pages) ? pages : [])
      .map((p: unknown) => Number(p))
      .filter((p: number) => Number.isInteger(p) && p >= 1);

    if (selected.length === 0) {
      return Response.json({ error: 'Select at least one page to remove' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);

    let total: number;
    try {
      total = await getPageCount(bytes);
    } catch {
      return Response.json({ error: 'Could not read the PDF file' }, { status: 400 });
    }

    const unique = [...new Set(selected.filter((p) => p <= total))];
    if (unique.length === 0) {
      return Response.json({ error: 'The selected pages are outside this document' }, { status: 400 });
    }
    if (unique.length >= total) {
      return Response.json({ error: 'You cannot remove every page of the document' }, { status: 400 });
    }

    const out = await removePages(bytes, unique);

    const safeBase =
      (typeof filename === 'string' ? filename : '').replace(/\.pdf$/i, '').replace(/[^\w.\-]+/g, '_') || 'document';

    return Response.json({
      dataUrl: bytesToBase64(out),
      filename: `${safeBase}-pages-removed.pdf`,
      mimeType: 'application/pdf',
      pageCount: total - unique.length,
      removedCount: unique.length,
    });
  } catch (error) {
    console.error('Remove pages error:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove pages';
    return Response.json({ error: message }, { status: 500 });
  }
}
