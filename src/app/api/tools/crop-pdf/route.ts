import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

function toMargin(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // The page sends the margins at the top level: { file, top, bottom, left, right }.
    // A nested `margins` object is still accepted for backwards compatibility.
    const { file, margins } = body ?? {};

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const marginTop = toMargin(body?.top ?? margins?.top);
    const marginBottom = toMargin(body?.bottom ?? margins?.bottom);
    const marginLeft = toMargin(body?.left ?? margins?.left);
    const marginRight = toMargin(body?.right ?? margins?.right);

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return Response.json({ error: 'The PDF has no pages to crop' }, { status: 400 });
    }

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
      // Keep the remaining boxes inside the new media box so viewers agree on the crop.
      page.setBleedBox(newX, newY, newWidth, newHeight);
      page.setTrimBox(newX, newY, newWidth, newHeight);
      page.setArtBox(newX, newY, newWidth, newHeight);
    }

    const out = await pdfDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({
      dataUrl,
      filename: 'cropped.pdf',
      pageCount: pages.length,
      margins: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    });
  } catch (error) {
    console.error('Crop error:', error);
    return Response.json({ error: 'Failed to crop PDF' }, { status: 500 });
  }
}
