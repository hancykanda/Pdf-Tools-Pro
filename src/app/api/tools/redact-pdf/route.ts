import { NextRequest } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, regions } = body;

    if (!file || !Array.isArray(regions) || regions.length === 0) {
      return Response.json({ error: 'File and at least one redaction region are required' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);
    const redactColor = rgb(0, 0, 0);

    for (const region of regions) {
      const page = pdfDoc.getPage(region.page);
      page.drawRectangle({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        color: redactColor,
      });
    }

    const outBytes = await pdfDoc.save({ useObjectStreams: true });
    const dataUrl = bytesToBase64(outBytes);

    return Response.json({ dataUrl, filename: 'redacted.pdf' });
  } catch (error) {
    console.error('Redact error:', error);
    return Response.json({ error: 'Failed to redact PDF' }, { status: 500 });
  }
}
