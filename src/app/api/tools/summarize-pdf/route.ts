import { NextRequest } from 'next/server';
import { extractPdfText } from '@/lib/pdfText';
import { generateWithGemini } from '@/lib/gemini';

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
      return Response.json({ summary: text });
    }

    try {
      const summary = await generateWithGemini(
        `Please provide a concise summary of the following PDF content:\n\n${text}`
      );
      return Response.json({ summary });
    } catch (geminiError) {
      console.error('Gemini error:', geminiError);
      return Response.json({
        summary: text,
        warning: 'AI summarization is currently unavailable. Showing extracted text instead.',
      });
    }
  } catch (error) {
    console.error('Summarize PDF error:', error);
    return Response.json({ error: 'Failed to summarize PDF' }, { status: 500 });
  }
}
