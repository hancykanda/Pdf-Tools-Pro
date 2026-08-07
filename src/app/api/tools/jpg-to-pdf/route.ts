import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Page dimensions in PDF points (1pt = 1/72in), portrait orientation. */
const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
};

const MARGIN_SIZES: Record<string, number> = { none: 0, small: 20, large: 40 };

type Orientation = 'portrait' | 'landscape' | 'auto';

function detectImageType(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // The page posts multipart/form-data: repeated `files` entries (already in
    // the order the user arranged in the thumbnail grid) plus option fields.
    const formData = await request.formData();

    const entries = [
      ...formData.getAll('files'),
      ...formData.getAll('images'),
      ...formData.getAll('file'),
    ];
    const images = entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (images.length === 0) {
      return Response.json({ error: 'At least one image is required' }, { status: 400 });
    }

    const pageSize = String(formData.get('pageSize') ?? 'a4').toLowerCase();
    const orientation = String(formData.get('orientation') ?? 'portrait').toLowerCase() as Orientation;
    const marginValue = String(formData.get('margin') ?? 'none');
    const marginSize = MARGIN_SIZES[marginValue] ?? 0;

    // "fit" makes every page exactly as large as its image (plus margins).
    const fitToImage = pageSize === 'fit';
    const basePage = PAGE_SIZES[pageSize] ?? PAGE_SIZES.a4;

    const pdfDoc = await PDFDocument.create();

    for (const image of images) {
      const bytes = new Uint8Array(await image.arrayBuffer());
      const type = detectImageType(bytes);

      if (!type) {
        return Response.json(
          {
            error: `Unsupported image format: ${image.name || 'image'}. Please upload JPG or PNG images.`,
          },
          { status: 400 },
        );
      }

      const embedded =
        type === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

      let pageWidth: number;
      let pageHeight: number;

      if (fitToImage) {
        pageWidth = embedded.width + marginSize * 2;
        pageHeight = embedded.height + marginSize * 2;
      } else {
        const [portraitW, portraitH] = basePage;
        const landscape =
          orientation === 'landscape' ||
          (orientation === 'auto' && embedded.width > embedded.height);
        pageWidth = landscape ? portraitH : portraitW;
        pageHeight = landscape ? portraitW : portraitH;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const targetWidth = Math.max(1, pageWidth - marginSize * 2);
      const targetHeight = Math.max(1, pageHeight - marginSize * 2);
      const dims = embedded.scaleToFit(targetWidth, targetHeight);

      page.drawImage(embedded, {
        x: marginSize + (targetWidth - dims.width) / 2,
        y: marginSize + (targetHeight - dims.height) / 2,
        width: dims.width,
        height: dims.height,
      });
    }

    const outBytes = await pdfDoc.save();

    return new Response(new Uint8Array(outBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="converted.pdf"',
        'Content-Length': String(outBytes.length),
        'X-Page-Count': String(pdfDoc.getPageCount()),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Image to PDF error:', error);
    return Response.json({ error: 'Failed to convert images to PDF' }, { status: 500 });
  }
}
