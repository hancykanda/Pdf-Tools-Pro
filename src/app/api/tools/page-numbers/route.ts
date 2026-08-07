import { NextRequest } from 'next/server';
import { degrees } from 'pdf-lib';
import {
  ToolRequestError,
  centeredPlacement,
  clamp,
  createFontLoader,
  getPageView,
  loadPdf,
  normalizePosition,
  parseColor,
  pdfResponse,
  presetCenter,
  readPdfUpload,
  resolveFontKey,
  sanitizeWinAnsi,
  suffixFilename,
  toNumber,
  toolErrorResponse,
  viewToUser,
} from '@/lib/pdfEdit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FORMAT_PRESETS: Record<string, string> = {
  n: '{n}',
  number: '{n}',
  'page-n': 'Page {n}',
  'page-n-of-total': 'Page {n} of {total}',
  'n-of-total': '{n} of {total}',
  'dash-n': '- {n} -',
};

function buildLabel(template: string, current: number, total: number): string {
  return template
    .replace(/\{n\}/gi, String(current))
    .replace(/\{total\}/gi, String(total))
    .replace(/\{page\}/gi, String(current))
    .replace(/\{pages\}/gi, String(total));
}

/**
 * Add page numbers — pdf-lib.
 *
 * options: {
 *   position: 'bottom-center' | 'top-right' | ... (9 corner/edge presets)
 *   startNumber: number          // value printed on the first numbered page
 *   format: '{n}' | 'Page {n}' | '{n} of {total}' | '- {n} -' | preset key
 *   fontSize, margin, fontFamily, color, bold
 *   firstPage, lastPage          // 1-based inclusive range to number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { bytes, options, filename } = await readPdfUpload(request);

    const pdfDoc = await loadPdf(bytes);
    const pages = pdfDoc.getPages();

    const position = normalizePosition(options.position, 'bottom-center');
    const startNumber = Math.max(0, Math.round(toNumber(options.startNumber ?? options.startPage, 1)));
    const fontSize = clamp(toNumber(options.fontSize, 12), 4, 96);
    const margin = clamp(toNumber(options.margin, 24), 0, 200);
    const color = parseColor(options.color, undefined);
    const fontKey = resolveFontKey(options.fontFamily, options.bold);

    const firstPage = clamp(Math.round(toNumber(options.firstPage, 1)), 1, pages.length);
    const lastPage = clamp(Math.round(toNumber(options.lastPage, pages.length)), firstPage, pages.length);

    const rawFormat = String(options.format ?? '{n}').trim() || '{n}';
    const template = FORMAT_PRESETS[rawFormat.toLowerCase()] ?? rawFormat;
    if (!/\{n\}|\{page\}/i.test(template)) {
      throw new ToolRequestError('The format must contain {n} where the page number goes');
    }

    const getFont = createFontLoader(pdfDoc);
    const font = await getFont(fontKey);

    const numbered = lastPage - firstPage + 1;
    const total = startNumber + numbered - 1;

    for (let index = firstPage - 1; index <= lastPage - 1; index++) {
      const page = pages[index];
      const view = getPageView(page);
      const label = sanitizeWinAnsi(buildLabel(template, startNumber + (index - (firstPage - 1)), total));
      if (!label) continue;

      const textWidth = font.widthOfTextAtSize(label, fontSize);
      const center = presetCenter(position, view.width, view.height, textWidth, fontSize, margin);
      const centerUser = viewToUser(view, center.x, center.y);
      // 0.7em is roughly the cap height, which is what the eye centres on.
      const origin = centeredPlacement(centerUser, textWidth, fontSize * 0.7, view.rotation);

      page.drawText(label, {
        x: origin.x,
        y: origin.y,
        size: fontSize,
        font,
        color,
        rotate: degrees(view.rotation),
      });
    }

    const out = await pdfDoc.save();

    return pdfResponse(out, suffixFilename(filename, 'numbered'), {
      'X-Page-Count': String(pages.length),
      'X-Pages-Numbered': String(numbered),
    });
  } catch (error) {
    return toolErrorResponse(error, 'Failed to add page numbers');
  }
}
