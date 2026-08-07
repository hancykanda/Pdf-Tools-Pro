import { NextRequest } from 'next/server';
import { PDFDocument, PDFImage, StandardFonts, degrees, rgb } from 'pdf-lib';

import { normalizeRotation } from '@/lib/pdfPlacement';
import {
  errorResponse,
  getPdfFromPayload,
  looksLikePdf,
  pdfResponse,
  readToolRequest,
} from '@/lib/securityTools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LEGACY_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

type LegacyPosition = (typeof LEGACY_POSITIONS)[number];

interface Placement {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The page's /Rotate value, so the stamp appears upright to the reader. */
  rotation: number;
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function decodeImage(dataUrl: string): { bytes: Uint8Array; type: 'png' | 'jpg' } | null {
  const clean = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(clean, 'base64'));
  } catch {
    return null;
  }
  if (bytes.length < 4) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { bytes, type: 'png' };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, type: 'jpg' };
  if (/^data:image\/png/i.test(dataUrl)) return { bytes, type: 'png' };
  if (/^data:image\/jpe?g/i.test(dataUrl)) return { bytes, type: 'jpg' };
  return null;
}

function normalizePlacements(raw: unknown): Placement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const pageIndex =
        item.pageIndex !== undefined
          ? Math.round(toNumber(item.pageIndex, 0))
          : Math.round(toNumber(item.pageNumber, 1)) - 1;
      return {
        pageIndex,
        x: toNumber(item.x),
        y: toNumber(item.y),
        width: toNumber(item.width),
        height: toNumber(item.height),
        rotation: normalizeRotation(toNumber(item.rotation)),
      };
    })
    .filter((p) => p.width > 0 && p.height > 0 && Number.isFinite(p.pageIndex));
}

/**
 * Sign PDF — stamps a hand-drawn / typed / uploaded signature onto the pages
 * with pdf-lib. Placements come from the browser canvas in PDF points with the
 * origin at the bottom-left of the page.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await readToolRequest(request);
    const fields = payload.fields;

    const bytes = getPdfFromPayload(payload, 'file');
    if (!bytes) return errorResponse('A PDF file is required');
    if (!looksLikePdf(bytes)) return errorResponse('The uploaded file is not a valid PDF');

    const signatureImage =
      typeof fields.signatureImage === 'string'
        ? fields.signatureImage
        : typeof (fields.signature as Record<string, unknown> | undefined)?.image === 'string'
          ? String((fields.signature as Record<string, unknown>).image)
          : '';

    const signatureText = String(fields.signatureText ?? fields.text ?? '').trim();
    const placements = normalizePlacements(fields.placements);

    if (!signatureImage && !signatureText) {
      return errorResponse('Draw, type or upload a signature first');
    }

    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return errorResponse('The PDF has no pages to sign');

    let embedded: PDFImage | null = null;
    if (signatureImage) {
      const decoded = decodeImage(signatureImage);
      if (!decoded) return errorResponse('The signature image could not be read');
      embedded =
        decoded.type === 'png'
          ? await pdfDoc.embedPng(decoded.bytes)
          : await pdfDoc.embedJpg(decoded.bytes);
    }

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    // Helvetica is WinAnsi-only; drop anything it cannot encode.
    const safeText = signatureText.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').trim();

    const effectivePlacements: Placement[] = placements.length > 0 ? placements : [];

    if (effectivePlacements.length === 0) {
      // Legacy contract: a keyword position applied to every page.
      const position = LEGACY_POSITIONS.includes(fields.position as LegacyPosition)
        ? (fields.position as LegacyPosition)
        : 'bottom-right';
      const padding = 40;

      pages.forEach((page, index) => {
        const { width, height } = page.getSize();
        const boxHeight = embedded ? 60 : 24;
        const boxWidth = embedded
          ? Math.min(180, width - padding * 2)
          : Math.min(font.widthOfTextAtSize(safeText || 'Signed', 20), width - padding * 2);

        let x = padding;
        if (position.endsWith('right')) x = width - padding - boxWidth;
        else if (position.endsWith('center')) x = (width - boxWidth) / 2;

        const y = position.startsWith('top') ? height - padding - boxHeight : padding;

        effectivePlacements.push({
          pageIndex: index,
          x,
          y,
          width: boxWidth,
          height: boxHeight,
          rotation: 0,
        });
      });
    }

    let applied = 0;
    for (const placement of effectivePlacements) {
      if (placement.pageIndex < 0 || placement.pageIndex >= pages.length) continue;
      const page = pages[placement.pageIndex];
      const rotation = normalizeRotation(placement.rotation);
      const upright = rotation === 90 || rotation === 270;

      // Size of the placement box as the reader sees it (rotation applied).
      const viewWidth = upright ? placement.height : placement.width;
      const viewHeight = upright ? placement.width : placement.height;

      if (embedded) {
        // Preserve the signature aspect ratio inside the requested box.
        const scale = Math.min(viewWidth / embedded.width, viewHeight / embedded.height);
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;

        // Centre the fitted image inside the box, in PDF user space.
        const boxWidth = upright ? drawHeight : drawWidth;
        const boxHeight = upright ? drawWidth : drawHeight;
        const originX = placement.x + (placement.width - boxWidth) / 2;
        const originY = placement.y + (placement.height - boxHeight) / 2;

        const anchor = {
          0: { x: originX, y: originY },
          90: { x: originX + boxWidth, y: originY },
          180: { x: originX + boxWidth, y: originY + boxHeight },
          270: { x: originX, y: originY + boxHeight },
        }[rotation];

        page.drawImage(embedded, {
          x: anchor.x,
          y: anchor.y,
          width: drawWidth,
          height: drawHeight,
          rotate: degrees(rotation),
        });
      } else {
        const text = safeText || signatureText || 'Signed';
        let size = viewHeight * 0.7;
        if (size > 0) {
          const textWidth = font.widthOfTextAtSize(text, size);
          if (textWidth > viewWidth) size = (size * viewWidth) / textWidth;
        }
        size = Math.max(4, size);

        const textWidth = font.widthOfTextAtSize(text, size);
        const padX = Math.max(0, (viewWidth - textWidth) / 2);
        const padY = Math.max(0, (viewHeight - size) / 2);

        // Offset the baseline inside the box, expressed in view space, then
        // rotate that offset into the page's coordinate system.
        const offset = {
          0: { x: placement.x + padX, y: placement.y + padY },
          90: { x: placement.x + placement.width - padY, y: placement.y + padX },
          180: {
            x: placement.x + placement.width - padX,
            y: placement.y + placement.height - padY,
          },
          270: { x: placement.x + padY, y: placement.y + placement.height - padX },
        }[rotation];

        page.drawText(text, {
          x: offset.x,
          y: offset.y,
          font,
          size,
          rotate: degrees(rotation),
          color: rgb(0.06, 0.09, 0.32),
        });
      }

      applied += 1;
    }

    if (applied === 0) {
      return errorResponse('No valid signature placement was provided');
    }

    const outBytes = await pdfDoc.save({ useObjectStreams: true });

    return pdfResponse(outBytes, 'signed.pdf', payload.wantsBinary, {
      signaturesPlaced: applied,
      pageCount: pages.length,
    });
  } catch (error) {
    console.error('Sign error:', error);
    return errorResponse('Failed to sign PDF', 500);
  }
}
