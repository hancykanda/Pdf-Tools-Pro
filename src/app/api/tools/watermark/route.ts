import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, text, opacity, position } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const watermarkText = text || 'Watermark';
    const watermarkOpacity = Math.max(0, Math.min(1, Number(opacity) || 0.3));
    const watermarkPosition = position || 'center';

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) * 0.08;

      let x = width / 2;
      let y = height / 2;

      if (watermarkPosition === 'top-left') {
        x = fontSize;
        y = height - fontSize;
      } else if (watermarkPosition === 'top-right') {
        x = width - fontSize * watermarkText.length * 0.6;
        y = height - fontSize;
      } else if (watermarkPosition === 'bottom-left') {
        x = fontSize;
        y = fontSize;
      } else if (watermarkPosition === 'bottom-right') {
        x = width - fontSize * watermarkText.length * 0.6;
        y = fontSize;
      }

      page.drawText(watermarkText, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: watermarkOpacity,
      });
    }

    const out = await pdfDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({ dataUrl, filename: 'watermarked.pdf' });
  } catch (error) {
    console.error('Watermark error:', error);
    return Response.json({ error: 'Failed to add watermark' }, { status: 500 });
  }
}
