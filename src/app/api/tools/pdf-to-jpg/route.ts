import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import { pdfToImages } from '@/lib/pdftoppm';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DPI_CHOICES = [72, 96, 150, 200, 300, 600];

export async function POST(request: NextRequest) {
  let file: File | null = null;
  let dpi = 150;
  let format: 'png' | 'jpeg' = 'jpeg';
  let quality = 90;

  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;

    const rawDpi = Number(formData.get('dpi'));
    if (Number.isFinite(rawDpi) && rawDpi > 0) {
      // Snap to a sane value so a hand-crafted request cannot ask for 5000 DPI.
      dpi = DPI_CHOICES.reduce((best, choice) =>
        Math.abs(choice - rawDpi) < Math.abs(best - rawDpi) ? choice : best,
      );
    }

    const rawFormat = String(formData.get('format') || 'jpg').toLowerCase();
    format = rawFormat === 'png' ? 'png' : 'jpeg';

    const rawQuality = Number(formData.get('quality'));
    if (Number.isFinite(rawQuality) && rawQuality >= 1 && rawQuality <= 100) {
      quality = Math.round(rawQuality);
    }
  } catch {
    return Response.json(
      { error: 'Invalid form data. Upload the PDF as multipart/form-data.' },
      { status: 400 },
    );
  }

  if (!file || file.size === 0) {
    return Response.json({ error: 'PDF file is required' }, { status: 400 });
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'Please upload a valid PDF file' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return Response.json({ error: 'Please upload a valid PDF file' }, { status: 400 });
    }

    // Server-side rasterization with poppler (pdftoppm) — no canvas needed.
    const { pages, extension } = await pdfToImages(buffer, { dpi, format, quality });
    const base = (file.name.replace(/\.[^/.]+$/, '') || 'document').replace(/[\r\n"\\/]+/g, '');

    // A single page downloads directly as an image; anything longer is zipped.
    if (pages.length === 1) {
      const image = pages[0].data;
      return new Response(new Uint8Array(image), {
        status: 200,
        headers: {
          'Content-Type': extension === 'png' ? 'image/png' : 'image/jpeg',
          'Content-Disposition': `attachment; filename="${base}.${extension}"`,
          'Content-Length': String(image.length),
          'X-Page-Count': '1',
          'X-Image-Dpi': String(dpi),
          'Cache-Control': 'no-store',
        },
      });
    }

    const zip = new JSZip();
    const pad = String(pages[pages.length - 1].page).length;
    for (const { page, data } of pages) {
      zip.file(`${base}-page-${String(page).padStart(pad, '0')}.${extension}`, data);
    }
    const archive = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new Response(new Uint8Array(archive), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${base}-${extension}.zip"`,
        'Content-Length': String(archive.length),
        'X-Page-Count': String(pages.length),
        'X-Image-Dpi': String(dpi),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF to image error:', error);
    const message =
      error instanceof Error && /pdftoppm/i.test(error.message)
        ? 'Image rendering failed. The PDF may be corrupted or password protected.'
        : 'Failed to convert PDF to images';
    return Response.json({ error: message }, { status: 500 });
  }
}
