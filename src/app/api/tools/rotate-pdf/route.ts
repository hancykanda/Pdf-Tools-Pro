import { NextRequest } from 'next/server';
import { PDFDocument, degrees } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, rotation } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const rotationDegrees = Number(rotation) || 90;
    if (![90, 180, 270].includes(rotationDegrees)) {
      return Response.json({ error: 'Invalid rotation angle' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      page.setRotation(degrees(rotationDegrees));
    }

    const out = await pdfDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({ dataUrl, filename: 'rotated.pdf' });
  } catch (error) {
    console.error('Rotate error:', error);
    return Response.json({ error: 'Failed to rotate PDF' }, { status: 500 });
  }
}
