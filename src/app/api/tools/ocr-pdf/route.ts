import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { base64ToBytes } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, filename } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);

    try {
      const pdfDoc = await PDFDocument.load(bytes);
      const pageCount = pdfDoc.getPageCount();

      if (pageCount === 0) {
        return Response.json({ error: 'The uploaded PDF contains no pages' }, { status: 400 });
      }

      return Response.json({
        ok: true,
        message: 'OCR processing would happen here',
        pageCount,
        filename: filename || 'document.pdf',
      });
    } catch {
      return Response.json({ error: 'Could not parse the uploaded PDF' }, { status: 400 });
    }
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json({ error: 'Failed to process OCR request' }, { status: 500 });
  }
}
