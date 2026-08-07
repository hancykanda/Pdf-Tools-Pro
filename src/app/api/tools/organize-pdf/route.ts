import { NextRequest } from 'next/server';
import { buildPdfFromPlan, getPageCount, normalizeRotation, type PagePlanItem } from '@/lib/pdfPages';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

/**
 * Reorder / duplicate / delete / rotate the pages of a PDF.
 *
 * Body (JSON), either shape:
 *   { file, pages: [{ page: 1-based number, rotation?: 0|90|180|270 }] }
 *   { file, pageOrder: number[] }   // legacy: 1-based order, no rotation
 *
 * Response: { dataUrl, filename, mimeType, pageCount }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, pages, pageOrder, filename } = body ?? {};

    if (!file || typeof file !== 'string') {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    let plan: PagePlanItem[] = [];

    if (Array.isArray(pages) && pages.length > 0) {
      plan = pages
        .map((entry: unknown): PagePlanItem | null => {
          if (typeof entry === 'number') return { page: entry, rotation: 0 };
          if (entry && typeof entry === 'object') {
            const record = entry as { page?: unknown; rotation?: unknown };
            const page = Number(record.page);
            if (!Number.isInteger(page)) return null;
            return { page, rotation: normalizeRotation(record.rotation ?? 0) };
          }
          return null;
        })
        .filter((item): item is PagePlanItem => item !== null);
    } else if (Array.isArray(pageOrder) && pageOrder.length > 0) {
      plan = pageOrder
        .map((n: unknown) => Number(n))
        .filter((n: number) => Number.isInteger(n))
        .map((page: number) => ({ page, rotation: 0 }));
    }

    if (plan.length === 0) {
      return Response.json({ error: 'A page order is required' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);

    let total: number;
    try {
      total = await getPageCount(bytes);
    } catch {
      return Response.json({ error: 'Could not read the PDF file' }, { status: 400 });
    }

    const valid = plan.filter((item) => item.page >= 1 && item.page <= total);
    if (valid.length === 0) {
      return Response.json({ error: 'The requested pages are outside this document' }, { status: 400 });
    }

    const out = await buildPdfFromPlan(bytes, valid);

    const safeBase =
      (typeof filename === 'string' ? filename : '').replace(/\.pdf$/i, '').replace(/[^\w.\-]+/g, '_') || 'organized';

    return Response.json({
      dataUrl: bytesToBase64(out),
      filename: safeBase === 'organized' ? 'organized.pdf' : `${safeBase}-organized.pdf`,
      mimeType: 'application/pdf',
      pageCount: valid.length,
    });
  } catch (error) {
    console.error('Organize error:', error);
    const message = error instanceof Error ? error.message : 'Failed to organize PDF';
    return Response.json({ error: message }, { status: 500 });
  }
}
