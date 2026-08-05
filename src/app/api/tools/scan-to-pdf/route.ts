import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

const MARGIN_SIZES: Record<string, number> = { none: 0, small: 20, large: 40 };

// US Letter, matching the default pdf-lib page size used elsewhere in the app.
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

function detectImageType(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // The page posts multipart/form-data: repeated `files` entries plus a `margin` string.
    const formData = await request.formData();

    const entries = [...formData.getAll('files'), ...formData.getAll('images'), ...formData.getAll('file')];
    const images = entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (images.length === 0) {
      return Response.json({ error: 'At least one image is required' }, { status: 400 });
    }

    const marginValue = String(formData.get('margin') ?? 'none');
    const marginSize = MARGIN_SIZES[marginValue] ?? 0;

    const pdfDoc = await PDFDocument.create();

    for (const image of images) {
      const bytes = new Uint8Array(await image.arrayBuffer());
      const type = detectImageType(bytes);

      if (!type) {
        return Response.json(
          { error: `Unsupported image format: ${image.name || 'image'}. Please upload JPG or PNG scans.` },
          { status: 400 }
        );
      }

      const embedded = type === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const targetWidth = Math.max(1, PAGE_WIDTH - marginSize * 2);
      const targetHeight = Math.max(1, PAGE_HEIGHT - marginSize * 2);
      const dims = embedded.scaleToFit(targetWidth, targetHeight);

      page.drawImage(embedded, {
        x: marginSize + (targetWidth - dims.width) / 2,
        y: marginSize + (targetHeight - dims.height) / 2,
        width: dims.width,
        height: dims.height,
      });
    }

    const outBytes = await pdfDoc.save();
    const dataUrl = bytesToBase64(outBytes);

    return Response.json({
      dataUrl,
      filename: 'scanned.pdf',
      pageCount: pdfDoc.getPageCount(),
    });
  } catch (error) {
    console.error('Scan to PDF error:', error);
    return Response.json({ error: 'Failed to convert images to PDF' }, { status: 500 });
  }
}
