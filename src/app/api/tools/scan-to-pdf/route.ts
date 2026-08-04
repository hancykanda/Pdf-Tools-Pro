import { NextRequest } from 'next/server';
import { imagesToPDF, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, margin } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return Response.json({ error: 'At least one image is required' }, { status: 400 });
    }

    const validMargin = margin === 'small' || margin === 'large' ? margin : 'none';
    const bytes = await imagesToPDF(images, { margin: validMargin });
    const dataUrl = bytesToBase64(bytes);

    return Response.json({ dataUrl, filename: 'scanned.pdf', pageCount: images.length });
  } catch (error) {
    console.error('Scan to PDF error:', error);
    return Response.json({ error: 'Failed to convert images to PDF' }, { status: 500 });
  }
}
