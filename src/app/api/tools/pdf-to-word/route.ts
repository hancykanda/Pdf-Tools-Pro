import { NextRequest } from 'next/server';
import { PDFParse } from 'pdf-parse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64 } = body;

    if (!pdfBase64) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const cleanBase64 = pdfBase64.split(',')[1] || pdfBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    return Response.json({
      text: result.text || 'No text could be extracted from this PDF.',
      pagesCount: result.pages?.length || 0,
    });
  } catch (error) {
    console.error('PDF extract error:', error);
    return Response.json({ error: 'Failed to extract text from PDF' }, { status: 500 });
  }
}