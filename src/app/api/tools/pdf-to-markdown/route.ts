import { NextRequest } from 'next/server';
import { extractPdfText } from '@/lib/pdfText';

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
    const text = (await extractPdfText(buffer)) || 'No text could be extracted from this PDF.';

    if (text === 'No text could be extracted from this PDF.') {
      return Response.json({ markdown: text });
    }

    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    const markdown = paragraphs
      .map((p: string) => {
        const trimmed = p.trim();
        if (/^#{1,6}\s/.test(trimmed)) {
          return trimmed;
        }
        if (/^[-*]\s/.test(trimmed)) {
          return trimmed;
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return trimmed;
        }
        if (trimmed.length > 0) {
          return trimmed;
        }
        return '';
      })
      .filter((p: string) => p.length > 0)
      .join('\n\n');

    return Response.json({ markdown });
  } catch (error) {
    console.error('PDF to Markdown error:', error);
    return Response.json({ error: 'Failed to convert PDF to Markdown' }, { status: 500 });
  }
}
