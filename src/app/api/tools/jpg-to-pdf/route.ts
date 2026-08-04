import { NextRequest } from 'next/server';
import { imagesToPDF, toDataUrl } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, margin } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return Response.json({ error: 'At least one image is required' }, { status: 400 });
    }

    const bytes = await imagesToPDF(images, { margin: margin || 'none' });
    const dataUrl = toDataUrl(bytes, 'application/pdf');

    return Response.json({ dataUrl, filename: 'converted.pdf' });
  } catch (error) {
    console.error('Image to PDF error:', error);
    return Response.json({ error: 'Failed to convert images to PDF' }, { status: 500 });
  }
}