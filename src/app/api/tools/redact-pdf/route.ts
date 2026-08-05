import { NextRequest } from 'next/server';
import { PDFDocument, PDFArray, PDFDict, PDFName, PDFNumber, PDFPage, rgb } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

type RawRegion = {
  page?: unknown;
  pageNumber?: unknown;
  x?: unknown;
  xPosition?: unknown;
  y?: unknown;
  yPosition?: unknown;
  width?: unknown;
  height?: unknown;
};

type Region = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

function toNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Normalises a region. The page sends 1-based `pageNumber` plus
 * `xPosition`/`yPosition`/`width`/`height`; the legacy shape used a 0-based
 * `page` plus `x`/`y`/`width`/`height`. Both are accepted.
 */
function normalizeRegion(raw: RawRegion): Region {
  const hasPageNumber = raw.pageNumber !== undefined && raw.pageNumber !== null;
  const pageIndex = hasPageNumber
    ? Math.round(toNumber(raw.pageNumber, 1)) - 1
    : Math.round(toNumber(raw.page, 0));

  return {
    pageIndex,
    x: toNumber(raw.xPosition ?? raw.x, 0),
    y: toNumber(raw.yPosition ?? raw.y, 0),
    width: toNumber(raw.width, 0),
    height: toNumber(raw.height, 0),
  };
}

/**
 * Drops annotations (links, comments, form widgets, ...) that overlap the
 * redacted area. Their content would otherwise still be readable/selectable
 * underneath the black box. Best effort: never throws.
 */
function stripOverlappingAnnotations(
  pdfDoc: PDFDocument,
  page: PDFPage,
  box: { x: number; y: number; width: number; height: number }
): number {
  try {
    const annots = page.node.Annots();
    if (!annots) return 0;

    const kept = PDFArray.withContext(pdfDoc.context);
    let removed = 0;

    for (let i = 0; i < annots.size(); i++) {
      const entry = annots.get(i);
      let overlaps = false;

      try {
        const dict = pdfDoc.context.lookup(entry, PDFDict);
        const rect = dict?.lookup(PDFName.of('Rect'), PDFArray);

        if (rect && rect.size() === 4) {
          const [ax0, ay0, ax1, ay1] = [0, 1, 2, 3].map((idx) =>
            rect.lookup(idx, PDFNumber).asNumber()
          );
          const aLeft = Math.min(ax0, ax1);
          const aRight = Math.max(ax0, ax1);
          const aBottom = Math.min(ay0, ay1);
          const aTop = Math.max(ay0, ay1);

          overlaps =
            aLeft < box.x + box.width &&
            aRight > box.x &&
            aBottom < box.y + box.height &&
            aTop > box.y;
        }
      } catch {
        overlaps = false;
      }

      if (overlaps) {
        removed += 1;
      } else {
        kept.push(entry);
      }
    }

    if (removed > 0) {
      page.node.set(PDFName.of('Annots'), kept);
    }

    return removed;
  } catch {
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, regions } = body ?? {};

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    // The page posts a single region at the top level; an array of regions is also supported.
    const rawRegions: RawRegion[] = Array.isArray(regions) && regions.length > 0
      ? (regions as RawRegion[])
      : [body as RawRegion];

    const parsedRegions = rawRegions.map(normalizeRegion);
    const validRegions = parsedRegions.filter((r) => r.width > 0 && r.height > 0);

    if (validRegions.length === 0) {
      return Response.json(
        { error: 'A redaction region with a positive width and height is required' },
        { status: 400 }
      );
    }

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) {
      return Response.json({ error: 'The PDF has no pages to redact' }, { status: 400 });
    }

    const redactColor = rgb(0, 0, 0);
    let applied = 0;
    let annotationsRemoved = 0;

    for (const region of validRegions) {
      if (region.pageIndex < 0 || region.pageIndex >= pageCount) {
        return Response.json(
          { error: `Page ${region.pageIndex + 1} does not exist. The document has ${pageCount} page(s).` },
          { status: 400 }
        );
      }

      const page = pdfDoc.getPage(region.pageIndex);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Clamp the box to the page so the redaction is always visible on the page.
      const x = Math.max(0, Math.min(region.x, pageWidth));
      const y = Math.max(0, Math.min(region.y, pageHeight));
      const boxWidth = Math.min(region.width, pageWidth - x);
      const boxHeight = Math.min(region.height, pageHeight - y);

      if (boxWidth <= 0 || boxHeight <= 0) continue;

      // Fully opaque black box: it covers (hides) whatever is painted underneath.
      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: redactColor,
        borderColor: redactColor,
        borderWidth: 0,
        opacity: 1,
      });

      // Anything interactive sitting under the box (links, form fields, notes)
      // would still expose the hidden content, so remove it.
      annotationsRemoved += stripOverlappingAnnotations(pdfDoc, page, {
        x,
        y,
        width: boxWidth,
        height: boxHeight,
      });

      applied += 1;
    }

    if (applied === 0) {
      return Response.json(
        { error: 'The redaction region falls outside the page bounds' },
        { status: 400 }
      );
    }

    const outBytes = await pdfDoc.save({ useObjectStreams: true });
    const dataUrl = bytesToBase64(outBytes);

    return Response.json({
      dataUrl,
      filename: 'redacted.pdf',
      regionsApplied: applied,
      annotationsRemoved,
    });
  } catch (error) {
    console.error('Redact error:', error);
    return Response.json({ error: 'Failed to redact PDF' }, { status: 500 });
  }
}
