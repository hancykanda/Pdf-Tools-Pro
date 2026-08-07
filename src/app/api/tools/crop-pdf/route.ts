import { NextRequest } from 'next/server';
import {
  ToolRequestError,
  clamp,
  getPageView,
  loadPdf,
  pdfResponse,
  readPdfUpload,
  suffixFilename,
  toNumber,
  toolErrorResponse,
  viewToUser,
} from '@/lib/pdfEdit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface FractionMargins {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function readCropFractions(options: Record<string, unknown>): FractionMargins | null {
  const raw = options.crop;
  const source =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : (raw as Record<string, unknown> | undefined);

  if (!source || typeof source !== 'object') return null;

  const left = clamp(toNumber(source.left, 0), 0, 0.98);
  const top = clamp(toNumber(source.top, 0), 0, 0.98);
  const right = clamp(toNumber(source.right, 0), 0, 0.98);
  const bottom = clamp(toNumber(source.bottom, 0), 0, 0.98);

  if (left + right >= 0.99 || top + bottom >= 0.99) {
    throw new ToolRequestError('The crop box is too small');
  }

  return { left, top, right, bottom };
}

/**
 * Crop PDF — pdf-lib.
 *
 * The canvas UI sends the crop box as fractions of the rendered page so the
 * same box can be applied to pages of different sizes and rotations:
 *
 *   options: {
 *     crop: { left, top, right, bottom }   // 0..1 margins measured in view space
 *     applyToAll?: boolean                 // default true
 *     pageIndex?: number                   // page the box was drawn on
 *   }
 *
 * Absolute point margins (`{ top, bottom, left, right }`) are still accepted.
 */
export async function POST(request: NextRequest) {
  try {
    const { bytes, options, filename } = await readPdfUpload(request);

    const pdfDoc = await loadPdf(bytes);
    const pages = pdfDoc.getPages();

    const fractions = readCropFractions(options);
    const applyToAll = options.applyToAll === undefined ? true : options.applyToAll === true || options.applyToAll === 'true';
    const pageIndex = clamp(Math.round(toNumber(options.pageIndex, 0)), 0, pages.length - 1);
    const targets = applyToAll ? pages.map((_, i) => i) : [pageIndex];

    // Legacy: absolute margins in points, in view space of an unrotated page.
    const absolute = {
      top: Math.max(0, toNumber(options.top, 0)),
      bottom: Math.max(0, toNumber(options.bottom, 0)),
      left: Math.max(0, toNumber(options.left, 0)),
      right: Math.max(0, toNumber(options.right, 0)),
    };

    if (!fractions && absolute.top === 0 && absolute.bottom === 0 && absolute.left === 0 && absolute.right === 0) {
      throw new ToolRequestError('Set a crop area before cropping');
    }

    for (const index of targets) {
      const page = pages[index];
      const view = getPageView(page);

      const margins = fractions
        ? {
            left: fractions.left * view.width,
            right: fractions.right * view.width,
            top: fractions.top * view.height,
            bottom: fractions.bottom * view.height,
          }
        : absolute;

      // Corners of the crop box in view space, mapped back into user space.
      const a = viewToUser(view, margins.left, margins.top);
      const b = viewToUser(view, view.width - margins.right, view.height - margins.bottom);

      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const width = Math.abs(b.x - a.x);
      const height = Math.abs(b.y - a.y);

      if (width < 10 || height < 10) {
        throw new ToolRequestError('The crop area is too small (minimum 10 x 10 points)');
      }

      page.setMediaBox(x, y, width, height);
      page.setCropBox(x, y, width, height);
      // Keep the remaining boxes inside the new media box so viewers agree.
      page.setBleedBox(x, y, width, height);
      page.setTrimBox(x, y, width, height);
      page.setArtBox(x, y, width, height);
    }

    const out = await pdfDoc.save();

    return pdfResponse(out, suffixFilename(filename, 'cropped'), {
      'X-Page-Count': String(pages.length),
      'X-Pages-Cropped': String(targets.length),
    });
  } catch (error) {
    return toolErrorResponse(error, 'Failed to crop PDF');
  }
}
