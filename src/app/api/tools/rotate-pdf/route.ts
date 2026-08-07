import { NextRequest } from 'next/server';
import { degrees } from 'pdf-lib';
import {
  ToolRequestError,
  loadPdf,
  normalizeAngle,
  pdfResponse,
  readPdfUpload,
  suffixFilename,
  toNumber,
  toolErrorResponse,
} from '@/lib/pdfEdit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Rotate PDF — pdf-lib.
 *
 * Body (multipart/form-data preferred):
 *   file      : the PDF
 *   options   : { rotations?: number[], rotation?: number }
 *
 * `rotations` holds one *delta* (a multiple of 90) per page as produced by the
 * thumbnail grid; `rotation` applies a single delta to every page.
 *
 * Responds with the rotated PDF bytes.
 */
export async function POST(request: NextRequest) {
  try {
    const { bytes, options, filename } = await readPdfUpload(request);
    const pdfDoc = await loadPdf(bytes);
    const pages = pdfDoc.getPages();

    let deltas: number[];

    const raw = options.rotations;
    const list = typeof raw === 'string' ? safeParseArray(raw) : raw;

    if (Array.isArray(list)) {
      if (list.length === 0) {
        throw new ToolRequestError('No page rotations were provided');
      }
      deltas = pages.map((_, index) => normalizeAngle(toNumber(list[index], 0)));
    } else {
      const uniform = normalizeAngle(toNumber(options.rotation, 90));
      if (![0, 90, 180, 270].includes(uniform)) {
        throw new ToolRequestError('Rotation must be a multiple of 90 degrees');
      }
      deltas = pages.map(() => uniform);
    }

    let changed = 0;
    pages.forEach((page, index) => {
      const delta = deltas[index] ?? 0;
      if (delta === 0) return;
      const current = normalizeAngle(page.getRotation().angle);
      page.setRotation(degrees(normalizeAngle(current + delta)));
      changed += 1;
    });

    const out = await pdfDoc.save();

    return pdfResponse(out, suffixFilename(filename, 'rotated'), {
      'X-Pages-Rotated': String(changed),
      'X-Page-Count': String(pages.length),
    });
  } catch (error) {
    return toolErrorResponse(error, 'Failed to rotate PDF');
  }
}

function safeParseArray(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map(Number);
  }
}
