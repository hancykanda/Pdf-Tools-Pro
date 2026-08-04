import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, startPage } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const startAt = Math.max(1, Number(startPage) || 1);

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNumber = i + 1;
      if (pageNumber < startAt) continue;

      const { width } = page.getSize();
      const fontSize = 12;
      const pageNumText = String(pageNumber);

      const textWidth = font.widthOfTextAtSize(pageNumText, fontSize);

      page.drawText(pageNumText, {
        x: width - textWidth - 20,
        y: 20,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    const out = await pdfDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({ dataUrl, filename: 'page-numbers.pdf' });
  } catch (error) {
    console.error('Page numbers error:', error);
    return Response.json({ error: 'Failed to add page numbers' }, { status: 500 });
  }
}
