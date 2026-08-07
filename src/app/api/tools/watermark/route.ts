import { NextRequest } from 'next/server';
import { PDFDocument, PDFImage, degrees } from 'pdf-lib';
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

function parsePageSelection(value: unknown, pageCount: number): number[] {
  const all = Array.from({ length: pageCount }, (_, i) => i);
  const raw = String(value ?? 'all').toLowerCase().trim();

  if (!raw || raw === 'all') return all;
  if (raw === 'odd') return all.filter((i) => i % 2 === 0);
  if (raw === 'even') return all.filter((i) => i % 2 === 1);
  if (raw === 'first') return [0];
  if (raw === 'last') return [pageCount - 1];

  const selected = new Set<number>();
  for (const part of raw.split(',')) {
    const chunk = part.trim();
    if (!chunk) continue;
    const range = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = Math.max(1, parseInt(range[1], 10));
      const to = Math.min(pageCount, parseInt(range[2], 10));
      for (let i = from; i <= to; i++) selected.add(i - 1);
      continue;
    }
    const single = parseInt(chunk, 10);
    if (Number.isFinite(single) && single >= 1 && single <= pageCount) selected.add(single - 1);
  }

  if (selected.size === 0) throw new ToolRequestError('The page selection did not match any page');
  return Array.from(selected).sort((a, b) => a - b);
}

function decodeDataUrl(value: string): Uint8Array {
  const base64 = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

async function embedImage(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  try {
    if (isPng) return await doc.embedPng(bytes);
    if (isJpg) return await doc.embedJpg(bytes);
  } catch {
    throw new ToolRequestError('The watermark image could not be embedded');
  }
  throw new ToolRequestError('The watermark image must be a PNG or JPG file');
}

/**
 * Add watermark — pdf-lib.
 *
 * options: {
 *   mode: 'text' | 'image'
 *   text, fontSize, fontFamily, bold, color
 *   opacity   : 0..1
 *   rotation  : degrees counter-clockwise
 *   position  : 9 presets (ignored when `tile` is on)
 *   margin, tile, scale (image width as a fraction of the page width)
 *   pages     : 'all' | 'odd' | 'even' | '1-3,7'
 * }
 * Image watermarks send the picture as the `image` form field (or `imageData`).
 */
export async function POST(request: NextRequest) {
  try {
    const { bytes, options, form, filename } = await readPdfUpload(request);

    const mode = String(options.mode ?? 'text').toLowerCase() === 'image' ? 'image' : 'text';
    const opacity = clamp(toNumber(options.opacity, 0.3), 0.01, 1);
    const rotation = toNumber(options.rotation, 0);
    const position = normalizePosition(options.position, 'center');
    const margin = clamp(toNumber(options.margin, 24), 0, 300);
    const tile = options.tile === true || options.tile === 'true';

    const pdfDoc = await loadPdf(bytes);
    const pages = pdfDoc.getPages();
    const targets = parsePageSelection(options.pages, pages.length);

    // --- resolve the watermark content -------------------------------------
    let text = '';
    let fontSize = 0;
    let font = null as Awaited<ReturnType<ReturnType<typeof createFontLoader>>> | null;
    let image: PDFImage | null = null;
    let imageScale = 0;

    if (mode === 'text') {
      text = sanitizeWinAnsi(String(options.text ?? '').trim());
      if (!text) throw new ToolRequestError('Watermark text is required');
      const getFont = createFontLoader(pdfDoc);
      font = await getFont(resolveFontKey(options.fontFamily, options.bold));
      fontSize = clamp(toNumber(options.fontSize, 48), 4, 400);
    } else {
      const asset = form?.get('image');
      let imageBytes: Uint8Array | null = null;
      if (asset instanceof File) {
        imageBytes = new Uint8Array(await asset.arrayBuffer());
      } else if (typeof options.imageData === 'string' && options.imageData) {
        imageBytes = decodeDataUrl(options.imageData);
      }
      if (!imageBytes || imageBytes.byteLength === 0) {
        throw new ToolRequestError('A watermark image is required');
      }
      image = await embedImage(pdfDoc, imageBytes);
      imageScale = clamp(toNumber(options.scale, 0.4), 0.02, 3);
    }

    const color = parseColor(options.color, undefined);

    for (const index of targets) {
      const page = pages[index];
      const view = getPageView(page);

      // Size of the watermark in view space.
      let blockWidth: number;
      let blockHeight: number;
      if (mode === 'text' && font) {
        blockWidth = font.widthOfTextAtSize(text, fontSize);
        blockHeight = fontSize * 0.7;
      } else if (image) {
        blockWidth = view.width * imageScale;
        blockHeight = (image.height / image.width) * blockWidth;
      } else {
        continue;
      }

      const centers: Array<{ x: number; y: number }> = [];
      if (tile) {
        const stepX = Math.max(blockWidth + Math.max(40, blockWidth * 0.35), 40);
        const stepY = Math.max(blockHeight + Math.max(60, blockHeight * 1.4), 40);
        const cols = Math.min(20, Math.ceil(view.width / stepX) + 1);
        const rows = Math.min(20, Math.ceil(view.height / stepY) + 1);
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            centers.push({ x: (col + 0.5) * stepX, y: (row + 0.5) * stepY });
          }
        }
      } else {
        centers.push(presetCenter(position, view.width, view.height, blockWidth, blockHeight, margin));
      }

      const angle = view.rotation + rotation;

      for (const center of centers) {
        const centerUser = viewToUser(view, center.x, center.y);
        const origin = centeredPlacement(centerUser, blockWidth, blockHeight, angle);

        if (mode === 'text' && font) {
          page.drawText(text, {
            x: origin.x,
            y: origin.y,
            size: fontSize,
            font,
            color,
            opacity,
            rotate: degrees(angle),
          });
        } else if (image) {
          page.drawImage(image, {
            x: origin.x,
            y: origin.y,
            width: blockWidth,
            height: blockHeight,
            opacity,
            rotate: degrees(angle),
          });
        }
      }
    }

    const out = await pdfDoc.save();

    return pdfResponse(out, suffixFilename(filename, 'watermarked'), {
      'X-Page-Count': String(pages.length),
      'X-Pages-Watermarked': String(targets.length),
    });
  } catch (error) {
    return toolErrorResponse(error, 'Failed to add watermark');
  }
}
