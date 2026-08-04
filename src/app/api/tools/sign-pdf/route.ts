import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, text, position = 'bottom-center' } = body;

    if (!file || !text) {
      return Response.json({ error: 'File and signature text are required' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 20;

    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      let x: number;
      let y: number;

      switch (position) {
        case 'top-left':
          x = 40;
          y = height - 30;
          break;
        case 'top-center':
          x = width / 2;
          y = height - 30;
          break;
        case 'top-right':
          x = width - 40;
          y = height - 30;
          break;
        case 'bottom-left':
          x = 40;
          y = 30;
          break;
        case 'bottom-right':
          x = width - 40;
          y = 30;
          break;
        case 'bottom-center':
        default:
          x = width / 2;
          y = 30;
          break;
      }

      const textWidth = font.widthOfTextAtSize(text, fontSize);
      if (x > width / 2) {
        x -= textWidth;
      } else {
        x -= textWidth / 2;
      }

      page.drawText(text, {
        x,
        y,
        font,
        size: fontSize,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    const outBytes = await pdfDoc.save({ useObjectStreams: true });
    const dataUrl = bytesToBase64(outBytes);

    return Response.json({ dataUrl, filename: 'signed.pdf' });
  } catch (error) {
    console.error('Sign error:', error);
    return Response.json({ error: 'Failed to sign PDF' }, { status: 500 });
  }
}
