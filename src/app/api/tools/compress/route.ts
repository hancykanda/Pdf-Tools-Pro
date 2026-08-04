import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const cleanBase64 = file.split(',')[1] || file;
    const arrayBuffer = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const bytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const dataUrl = `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`;
    return Response.json({ dataUrl, filename: 'compressed.pdf' });
  } catch (error) {
    console.error('Compress error:', error);
    return Response.json({ error: 'Failed to compress PDF' }, { status: 500 });
  }
}