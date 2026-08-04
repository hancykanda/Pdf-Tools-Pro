import { NextRequest } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { generateWithGemini } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64, targetLanguage = 'English' } = body;

    if (!pdfBase64) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const cleanBase64 = pdfBase64.split(',')[1] || pdfBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const text = result.text || 'No text could be extracted from this PDF.';

    if (text === 'No text could be extracted from this PDF.') {
      return Response.json({ translatedText: text });
    }

    try {
      const translatedText = await generateWithGemini(
        `Translate the following PDF content to ${targetLanguage}. Preserve the original formatting and structure as much as possible:\n\n${text}`
      );
      return Response.json({ translatedText, targetLanguage });
    } catch (geminiError) {
      console.error('Gemini error:', geminiError);
      return Response.json({
        translatedText: text,
        warning: `AI translation to ${targetLanguage} is currently unavailable. Showing extracted text instead.`,
      });
    }
  } catch (error) {
    console.error('Translate PDF error:', error);
    return Response.json({ error: 'Failed to translate PDF' }, { status: 500 });
  }
}
