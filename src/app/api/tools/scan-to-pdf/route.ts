import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { bytesToBase64 } from '@/lib/pdfUtils';
import { ocrPdf } from '@/lib/ocr';
import { which } from '@/lib/cli';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MARGIN_SIZES: Record<string, number> = { none: 0, small: 20, large: 40 };

const PAGE_SIZES: Record<string, [number, number]> = {
  // US Letter, matching the default pdf-lib page size used elsewhere in the app.
  letter: [612, 792],
  a4: [595.28, 841.89],
};

function detectImageType(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg';
  }
  return null;
}

/**
 * Build a PDF from scanned images.
 *
 * multipart/form-data:
 *   files      one or more images, in page order (also accepts `images`/`file`)
 *   margin     'none' | 'small' | 'large'
 *   pageSize   'auto' (page matches the image) | 'letter' | 'a4'
 *   orientation 'portrait' | 'landscape' (ignored when pageSize is 'auto')
 *   ocr        'true' to run ocrmypdf and produce a searchable PDF
 *
 * Response: { dataUrl, filename, mimeType, pageCount, ocr }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const entries = [...formData.getAll('files'), ...formData.getAll('images'), ...formData.getAll('file')];
    const images = entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (images.length === 0) {
      return Response.json({ error: 'At least one image is required' }, { status: 400 });
    }

    const marginValue = String(formData.get('margin') ?? 'none');
    const marginSize = MARGIN_SIZES[marginValue] ?? 0;
    const pageSizeValue = String(formData.get('pageSize') ?? 'letter');
    const orientation = String(formData.get('orientation') ?? 'portrait');
    const wantsOcr = String(formData.get('ocr') ?? '') === 'true';

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

      let pageWidth: number;
      let pageHeight: number;

      if (pageSizeValue === 'auto') {
        pageWidth = embedded.width + marginSize * 2;
        pageHeight = embedded.height + marginSize * 2;
      } else {
        const [w, h] = PAGE_SIZES[pageSizeValue] ?? PAGE_SIZES.letter;
        [pageWidth, pageHeight] = orientation === 'landscape' ? [h, w] : [w, h];
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

    let outBytes = await pdfDoc.save();
    let ocrApplied = false;

    if (wantsOcr && which('ocrmypdf')) {
      try {
        const searchable = await ocrPdf(Buffer.from(outBytes), 'eng');
        outBytes = new Uint8Array(searchable);
        ocrApplied = true;
      } catch (err) {
        // OCR is best-effort: fall back to the plain image PDF.
        console.error('Scan to PDF: OCR step failed, returning non-searchable PDF', err);
      }
    }

    return Response.json({
      dataUrl: bytesToBase64(outBytes),
      filename: 'scanned.pdf',
      mimeType: 'application/pdf',
      pageCount: pdfDoc.getPageCount(),
      ocr: ocrApplied,
    });
  } catch (error) {
    console.error('Scan to PDF error:', error);
    return Response.json({ error: 'Failed to convert images to PDF' }, { status: 500 });
  }
}
