import { NextRequest } from 'next/server';

import { applyRedactions, type RedactRect } from '@/lib/pdfRedact';
import {
  errorResponse,
  getPdfFromPayload,
  looksLikePdf,
  pdfResponse,
  readToolRequest,
} from '@/lib/securityTools';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type RawRegion = Record<string, unknown>;

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Accepts every shape the page has used over time:
 *  - { pageIndex, x, y, width, height }            (current)
 *  - { pageNumber, xPosition, yPosition, w, h }    (legacy single region)
 *  - { page, x, y, width, height }                 (legacy 0-based)
 */
function normalizeRegion(raw: RawRegion): RedactRect {
  const pageIndex =
    raw.pageIndex !== undefined && raw.pageIndex !== null
      ? Math.round(toNumber(raw.pageIndex, 0))
      : raw.pageNumber !== undefined && raw.pageNumber !== null
        ? Math.round(toNumber(raw.pageNumber, 1)) - 1
        : Math.round(toNumber(raw.page, 0));

  return {
    pageIndex,
    x: toNumber(raw.x ?? raw.xPosition),
    y: toNumber(raw.y ?? raw.yPosition),
    width: toNumber(raw.width),
    height: toNumber(raw.height),
  };
}

/**
 * Redact PDF — genuinely removes the content under each box.
 *
 * The page content streams are rewritten so every glyph inside a rectangle is
 * deleted (see `src/lib/pdfRedact.ts`); the black rectangle painted on top is
 * only the visual marker.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await readToolRequest(request);
    const fields = payload.fields;

    const bytes = getPdfFromPayload(payload, 'file');
    if (!bytes) return errorResponse('A PDF file is required');
    if (!looksLikePdf(bytes)) return errorResponse('The uploaded file is not a valid PDF');

    let rawRegions: RawRegion[] = [];
    const candidate = fields.rects ?? fields.regions ?? fields.boxes;
    if (typeof candidate === 'string') {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) rawRegions = parsed as RawRegion[];
      } catch {
        rawRegions = [];
      }
    } else if (Array.isArray(candidate)) {
      rawRegions = candidate as RawRegion[];
    }

    if (rawRegions.length === 0) {
      // Legacy: a single region posted at the top level.
      if (fields.width !== undefined && fields.height !== undefined) {
        rawRegions = [fields as RawRegion];
      }
    }

    const regions = rawRegions.map(normalizeRegion).filter((r) => r.width > 0 && r.height > 0);
    if (regions.length === 0) {
      return errorResponse('Draw at least one redaction box before redacting');
    }

    const { bytes: outBytes, stats } = await applyRedactions(bytes, regions);

    if (stats.regionsApplied === 0) {
      return errorResponse('The redaction boxes fall outside the pages of this document');
    }

    return pdfResponse(outBytes, 'redacted.pdf', payload.wantsBinary, {
      regionsApplied: stats.regionsApplied,
      pagesProcessed: stats.pagesProcessed,
      glyphsRemoved: stats.glyphsRemoved,
      textOpsModified: stats.textOpsModified,
      imagesRemoved: stats.imagesRemoved,
      annotationsRemoved: stats.annotationsRemoved,
    });
  } catch (error) {
    console.error('Redact error:', error);
    return errorResponse('Failed to redact PDF', 500);
  }
}
