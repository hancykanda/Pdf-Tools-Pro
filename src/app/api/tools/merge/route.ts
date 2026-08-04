import { NextRequest } from 'next/server';
import { mergePDFs, toDataUrl } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length < 2) {
      return Response.json({ error: 'At least 2 PDF files are required' }, { status: 400 });
    }

    const bytes = await mergePDFs(files);
    const dataUrl = toDataUrl(bytes, 'application/pdf');

    return Response.json({ dataUrl, filename: 'merged.pdf' });
  } catch (error) {
    console.error('Merge error:', error);
    return Response.json({ error: 'Failed to merge PDFs' }, { status: 500 });
  }
}