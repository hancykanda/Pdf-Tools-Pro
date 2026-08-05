import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

const POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

type Position = (typeof POSITIONS)[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // The page sends { file, signatureText, position }; `text` is kept as a fallback.
    const { file, signatureText, text, position } = body ?? {};

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const signature = String(signatureText ?? text ?? '').trim();
    if (!signature) {
      return Response.json({ error: 'Signature text is required' }, { status: 400 });
    }

    const placement: Position = POSITIONS.includes(position as Position)
      ? (position as Position)
      : 'bottom-right';

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return Response.json({ error: 'The PDF has no pages to sign' }, { status: 400 });
    }

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontSize = 20;
    const padding = 40;

    // Helvetica only supports WinAnsi, drop anything it cannot encode.
    const safeSignature = signature.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').trim() || signature;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(safeSignature, fontSize);

      let x: number;
      switch (placement) {
        case 'top-left':
        case 'bottom-left':
          x = padding;
          break;
        case 'top-right':
        case 'bottom-right':
          x = width - padding - textWidth;
          break;
        default:
          x = (width - textWidth) / 2;
          break;
      }

      const y = placement.startsWith('top') ? height - padding - fontSize : padding;

      page.drawText(safeSignature, {
        x: Math.max(0, Math.min(x, Math.max(0, width - textWidth))),
        y: Math.max(0, Math.min(y, Math.max(0, height - fontSize))),
        font,
        size: fontSize,
        color: rgb(0.1, 0.1, 0.45),
      });
    }

    const outBytes = await pdfDoc.save({ useObjectStreams: true });
    const dataUrl = bytesToBase64(outBytes);

    return Response.json({ dataUrl, filename: 'signed.pdf', pageCount: pages.length });
  } catch (error) {
    console.error('Sign error:', error);
    return Response.json({ error: 'Failed to sign PDF' }, { status: 500 });
  }
}
