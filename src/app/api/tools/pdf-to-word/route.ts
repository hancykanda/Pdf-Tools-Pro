import { NextRequest } from 'next/server';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export const dynamic = 'force-dynamic';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64 } = body;

    if (!pdfBase64) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const cleanBase64 = pdfBase64.split(',')[1] || pdfBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const uint8Array = new Uint8Array(buffer);

    const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
    const pagesCount = doc.numPages;
    let fullText = '';

    for (let i = 1; i <= pagesCount; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => (item as { str?: string }).str || '').join(' ');
      fullText += pageText + '\n\n';
      await page.cleanup();
    }

    return Response.json({
      text: fullText.trim() || 'No text could be extracted from this PDF.',
      pagesCount,
    });
  } catch (error) {
    console.error('PDF extract error:', error);
    return Response.json({ error: 'Failed to extract text from PDF' }, { status: 500 });
  }
}
