import { NextRequest } from 'next/server';
import { splitPDF, toDataUrl } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, pageIndices } = body;

    if (!file || !Array.isArray(pageIndices) || pageIndices.length === 0) {
      return Response.json({ error: 'File and page indices are required' }, { status: 400 });
    }

    const bytes = await splitPDF(file, pageIndices);
    const dataUrl = toDataUrl(bytes, 'application/pdf');

    return Response.json({ dataUrl, filename: 'split.pdf' });
  } catch (error) {
    console.error('Split error:', error);
    return Response.json({ error: 'Failed to split PDF' }, { status: 500 });
  }
}