import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, text, x, y, fontSize } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const overlayText = text || 'Overlay Text';
    const posX = Number(x) || 50;
    const posY = Number(y) || 50;
    const textFontSize = Math.max(8, Number(fontSize) || 24);

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const page of pages) {
      const { width, height } = page.getSize();

      const clampedX = Math.min(posX, width - textFontSize * overlayText.length * 0.6);
      const clampedY = Math.min(posY, height - textFontSize);

      page.drawText(overlayText, {
        x: clampedX,
        y: clampedY,
        size: textFontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    const out = await pdfDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({ dataUrl, filename: 'edited.pdf' });
  } catch (error) {
    console.error('Edit PDF error:', error);
    return Response.json({ error: 'Failed to edit PDF' }, { status: 500 });
  }
}
