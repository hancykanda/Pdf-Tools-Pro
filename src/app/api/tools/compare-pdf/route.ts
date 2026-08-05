import { NextRequest } from 'next/server';
import { extractPdfText } from '@/lib/pdfText';

export const dynamic = 'force-dynamic';

function computeSimpleDiff(text1: string, text2: string) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const result: Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }> = [];

  const maxLen = Math.max(lines1.length, lines2.length);
  for (let i = 0; i < maxLen; i++) {
    const l1 = lines1[i];
    const l2 = lines2[i];

    if (l1 === undefined) {
      result.push({ type: 'added', text: l2 });
    } else if (l2 === undefined) {
      result.push({ type: 'removed', text: l1 });
    } else if (l1 === l2) {
      result.push({ type: 'unchanged', text: l1 });
    } else {
      result.push({ type: 'removed', text: l1 });
      result.push({ type: 'added', text: l2 });
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file1, file2 } = body;

    if (!file1 || !file2) {
      return Response.json({ error: 'Two PDF files are required' }, { status: 400 });
    }

    const cleanBase64 = (base64: string) => base64.split(',')[1] || base64;

    const buffer1 = Buffer.from(cleanBase64(file1), 'base64');
    const text1 = (await extractPdfText(buffer1)) || '';

    const buffer2 = Buffer.from(cleanBase64(file2), 'base64');
    const text2 = (await extractPdfText(buffer2)) || '';

    const diff = computeSimpleDiff(text1, text2);

    return Response.json({ text1, text2, diff });
  } catch (error) {
    console.error('Compare error:', error);
    return Response.json({ error: 'Failed to compare PDFs' }, { status: 500 });
  }
}
