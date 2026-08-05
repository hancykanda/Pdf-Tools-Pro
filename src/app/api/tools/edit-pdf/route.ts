import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

function toNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // The page sends { file, overlayText, xPosition, yPosition, fontSize }.
    // The older { text, x, y } shape is still accepted as a fallback.
    const { file, overlayText, text, xPosition, x, yPosition, y, fontSize } = body ?? {};

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const content = String(overlayText ?? text ?? '').trim();
    if (!content) {
      return Response.json({ error: 'Overlay text is required' }, { status: 400 });
    }

    const posX = toNumber(xPosition ?? x, 50);
    const posY = toNumber(yPosition ?? y, 50);
    const textFontSize = Math.max(1, toNumber(fontSize, 24));

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return Response.json({ error: 'The PDF has no pages to edit' }, { status: 400 });
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    // Helvetica cannot encode characters outside WinAnsi, strip them to avoid a hard failure.
    const safeText = content.replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '');
    const lines = (safeText || content).split('\n');
    const lineHeight = textFontSize * 1.2;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const widestLine = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, textFontSize)));

      // Keep the stamp on the page without silently ignoring the requested position.
      const clampedX = Math.max(0, Math.min(posX, Math.max(0, width - widestLine)));
      const blockHeight = lineHeight * (lines.length - 1) + textFontSize;
      const clampedY = Math.max(0, Math.min(posY, Math.max(0, height - blockHeight)));

      lines.forEach((line, index) => {
        page.drawText(line, {
          x: clampedX,
          y: clampedY + lineHeight * (lines.length - 1 - index),
          size: textFontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });
    }

    const out = await pdfDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({
      dataUrl,
      filename: 'edited.pdf',
      pageCount: pages.length,
    });
  } catch (error) {
    console.error('Edit PDF error:', error);
    return Response.json({ error: 'Failed to edit PDF' }, { status: 500 });
  }
}
