import { NextRequest } from 'next/server';
import { LineCapStyle, PDFDocument, PDFImage, PDFPage, degrees } from 'pdf-lib';
import type { Color } from 'pdf-lib';
import {
  PageView,
  ToolRequestError,
  clamp,
  createFontLoader,
  getPageView,
  loadPdf,
  parseColor,
  pdfResponse,
  readPdfUpload,
  resolveFontKey,
  sanitizeWinAnsi,
  suffixFilename,
  toNumber,
  toolErrorResponse,
  uprightBox,
  viewToUser,
} from '@/lib/pdfEdit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Every annotation is expressed in "view space": the coordinate system of the
 * page as the user sees it in the canvas editor (points, top-left origin,
 * y downwards, page rotation already applied).
 */
interface RawAnnotation {
  type?: string;
  page?: unknown;
  x?: unknown;
  y?: unknown;
  x1?: unknown;
  y1?: unknown;
  x2?: unknown;
  y2?: unknown;
  width?: unknown;
  height?: unknown;
  text?: unknown;
  fontSize?: unknown;
  fontFamily?: unknown;
  bold?: unknown;
  color?: unknown;
  fill?: unknown;
  strokeWidth?: unknown;
  opacity?: unknown;
  points?: unknown;
  assetId?: unknown;
  data?: unknown;
}

function parseAnnotations(value: unknown): RawAnnotation[] {
  const source = typeof value === 'string' ? safeParse(value) : value;
  if (!Array.isArray(source)) return [];
  return source.filter((item): item is RawAnnotation => !!item && typeof item === 'object');
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new ToolRequestError('The annotations payload is not valid JSON');
  }
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
    throw new ToolRequestError('An image could not be embedded into the PDF');
  }
  throw new ToolRequestError('Images must be PNG or JPG files');
}

function drawPolyline(
  page: PDFPage,
  view: PageView,
  points: Array<[number, number]>,
  color: Color,
  thickness: number,
  opacity: number
) {
  if (points.length === 1) {
    // A dot: draw a tiny segment so it is still visible.
    points = [points[0], [points[0][0] + 0.1, points[0][1]]];
  }
  for (let i = 1; i < points.length; i++) {
    const start = viewToUser(view, points[i - 1][0], points[i - 1][1]);
    const end = viewToUser(view, points[i][0], points[i][1]);
    page.drawLine({
      start,
      end,
      thickness,
      color,
      opacity,
      lineCap: LineCapStyle.Round,
    });
  }
}

/**
 * Edit PDF — pdf-lib + canvas UI.
 *
 * multipart/form-data:
 *   file            : the PDF
 *   options         : { annotations: Annotation[] }
 *   asset:<id>      : PNG/JPG placed by the image tool
 *
 * Responds with the edited PDF bytes.
 */
export async function POST(request: NextRequest) {
  try {
    const { bytes, options, form, filename } = await readPdfUpload(request);

    const pdfDoc = await loadPdf(bytes);
    const pages = pdfDoc.getPages();
    const getFont = createFontLoader(pdfDoc);

    const annotations = parseAnnotations(options.annotations);

    // Legacy payload: a single text stamp repeated on every page.
    const legacyText = sanitizeWinAnsi(String(options.overlayText ?? options.text ?? '').trim());
    if (annotations.length === 0) {
      if (!legacyText) {
        throw new ToolRequestError('Add text, an image or a shape before saving');
      }

      const font = await getFont(resolveFontKey(options.fontFamily, options.bold));
      const size = clamp(toNumber(options.fontSize, 24), 1, 400);
      const posX = toNumber(options.xPosition ?? options.x, 50);
      const posY = toNumber(options.yPosition ?? options.y, 50);
      const lines = legacyText.split('\n');
      const lineHeight = size * 1.2;

      for (const page of pages) {
        const { width, height } = page.getSize();
        const widest = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, size)));
        const x = clamp(posX, 0, Math.max(0, width - widest));
        const blockHeight = lineHeight * (lines.length - 1) + size;
        const y = clamp(posY, 0, Math.max(0, height - blockHeight));

        lines.forEach((line, index) => {
          page.drawText(line, {
            x,
            y: y + lineHeight * (lines.length - 1 - index),
            size,
            font,
            color: parseColor(options.color, undefined),
          });
        });
      }

      const legacyOut = await pdfDoc.save();
      return pdfResponse(legacyOut, suffixFilename(filename, 'edited'), {
        'X-Page-Count': String(pages.length),
      });
    }

    // --- assets ------------------------------------------------------------
    const imageCache = new Map<string, PDFImage>();
    const getImage = async (annotation: RawAnnotation): Promise<PDFImage | null> => {
      const assetId = typeof annotation.assetId === 'string' ? annotation.assetId : null;
      const cacheKey = assetId ?? (typeof annotation.data === 'string' ? annotation.data.slice(0, 64) : null);
      if (cacheKey && imageCache.has(cacheKey)) return imageCache.get(cacheKey)!;

      let raw: Uint8Array | null = null;
      if (assetId) {
        const asset = form?.get(`asset:${assetId}`);
        if (asset instanceof File) raw = new Uint8Array(await asset.arrayBuffer());
      }
      if (!raw && typeof annotation.data === 'string' && annotation.data) {
        raw = decodeDataUrl(annotation.data);
      }
      if (!raw || raw.byteLength === 0) return null;

      const embedded = await embedImage(pdfDoc, raw);
      if (cacheKey) imageCache.set(cacheKey, embedded);
      return embedded;
    };

    let applied = 0;

    for (const annotation of annotations) {
      const pageIndex = clamp(Math.round(toNumber(annotation.page, 0)), 0, pages.length - 1);
      const page = pages[pageIndex];
      const view = getPageView(page);

      const color = parseColor(annotation.color, undefined);
      const opacity = clamp(toNumber(annotation.opacity, 1), 0.01, 1);
      const strokeWidth = clamp(toNumber(annotation.strokeWidth, 2), 0.1, 60);
      const type = String(annotation.type ?? '').toLowerCase();

      if (type === 'text') {
        const content = sanitizeWinAnsi(String(annotation.text ?? ''));
        if (!content.trim()) continue;

        const size = clamp(toNumber(annotation.fontSize, 16), 1, 400);
        const font = await getFont(resolveFontKey(annotation.fontFamily, annotation.bold));
        const lines = content.split('\n');
        const lineHeight = size * 1.2;
        const x = toNumber(annotation.x, 0);
        const y = toNumber(annotation.y, 0);

        lines.forEach((line, index) => {
          // 0.8em below the top of the line box is where the browser puts the
          // baseline for `line-height: 1`, so the export matches the editor.
          const baselineY = y + index * lineHeight + size * 0.8;
          const origin = viewToUser(view, x, baselineY);
          page.drawText(line, {
            x: origin.x,
            y: origin.y,
            size,
            font,
            color,
            opacity,
            rotate: degrees(view.rotation),
          });
        });
        applied += 1;
        continue;
      }

      if (type === 'image') {
        const image = await getImage(annotation);
        if (!image) continue;

        const width = Math.max(1, toNumber(annotation.width, 120));
        const height = Math.max(1, toNumber(annotation.height, (image.height / image.width) * width));
        const box = uprightBox(view, toNumber(annotation.x, 0), toNumber(annotation.y, 0), width, height);

        page.drawImage(image, {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          opacity,
          rotate: degrees(box.rotate),
        });
        applied += 1;
        continue;
      }

      if (type === 'rect' || type === 'rectangle' || type === 'square') {
        const width = Math.max(1, toNumber(annotation.width, 100));
        const height = Math.max(1, toNumber(annotation.height, 60));
        const box = uprightBox(view, toNumber(annotation.x, 0), toNumber(annotation.y, 0), width, height);
        const fill = typeof annotation.fill === 'string' && annotation.fill ? parseColor(annotation.fill) : undefined;

        page.drawRectangle({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          rotate: degrees(box.rotate),
          borderColor: color,
          borderWidth: strokeWidth,
          borderOpacity: opacity,
          color: fill,
          opacity: fill ? opacity : undefined,
        });
        applied += 1;
        continue;
      }

      if (type === 'ellipse' || type === 'circle') {
        const width = Math.max(1, toNumber(annotation.width, 100));
        const height = Math.max(1, toNumber(annotation.height, 100));
        const x = toNumber(annotation.x, 0);
        const y = toNumber(annotation.y, 0);
        const center = viewToUser(view, x + width / 2, y + height / 2);
        const fill = typeof annotation.fill === 'string' && annotation.fill ? parseColor(annotation.fill) : undefined;

        page.drawEllipse({
          x: center.x,
          y: center.y,
          xScale: width / 2,
          yScale: height / 2,
          rotate: degrees(view.rotation),
          borderColor: color,
          borderWidth: strokeWidth,
          borderOpacity: opacity,
          color: fill,
          opacity: fill ? opacity : undefined,
        });
        applied += 1;
        continue;
      }

      if (type === 'line' || type === 'arrow') {
        const start = viewToUser(view, toNumber(annotation.x1, 0), toNumber(annotation.y1, 0));
        const end = viewToUser(view, toNumber(annotation.x2, 0), toNumber(annotation.y2, 0));
        page.drawLine({ start, end, thickness: strokeWidth, color, opacity, lineCap: LineCapStyle.Round });
        applied += 1;
        continue;
      }

      if (type === 'draw' || type === 'freehand' || type === 'path') {
        const raw = Array.isArray(annotation.points) ? annotation.points : [];
        const points: Array<[number, number]> = [];
        for (const point of raw) {
          if (Array.isArray(point) && point.length >= 2) {
            points.push([toNumber(point[0], 0), toNumber(point[1], 0)]);
          } else if (point && typeof point === 'object') {
            const p = point as { x?: unknown; y?: unknown };
            points.push([toNumber(p.x, 0), toNumber(p.y, 0)]);
          }
        }
        if (points.length === 0) continue;
        drawPolyline(page, view, points, color, strokeWidth, opacity);
        applied += 1;
        continue;
      }
    }

    if (applied === 0) {
      throw new ToolRequestError('None of the edits could be applied');
    }

    const out = await pdfDoc.save();

    return pdfResponse(out, suffixFilename(filename, 'edited'), {
      'X-Page-Count': String(pages.length),
      'X-Edits-Applied': String(applied),
    });
  } catch (error) {
    return toolErrorResponse(error, 'Failed to edit PDF');
  }
}
