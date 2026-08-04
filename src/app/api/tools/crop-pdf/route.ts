import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, margins } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const marginTop = Math.max(0, Number(margins?.top) || 0);
    const marginBottom = Math.max(0, Number(margins?.bottom) || 0);
    const marginLeft = Math.max(0, Number(margins?.left) || 0);
    const marginRight = Math.max(0, Number(margins?.right) || 0);

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const mediaBox = page.getMediaBox();
      const newX = mediaBox.x + marginLeft;
      const newY = mediaBox.y + marginBottom;
      const newWidth = mediaBox.width - marginLeft - marginRight;
      const newHeight = mediaBox.height - marginBottom - marginTop;

      if (newWidth <= 0 || newHeight <= 0) {
        return Response.json({ error: 'Crop margins exceed page dimensions' }, { status: 400 });
      }

      page.setMediaBox(newX, newY, newWidth, newHeight);
      page.setCropBox(newX, newY, newWidth, newHeight);
    }

    const out = await pdfDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({ dataUrl, filename: 'cropped.pdf' });
  } catch (error) {
    console.error('Crop error:', error);
    return Response.json({ error: 'Failed to crop PDF' }, { status: 500 });
  }
}
