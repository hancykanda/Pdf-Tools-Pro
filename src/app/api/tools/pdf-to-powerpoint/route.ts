import { NextRequest } from 'next/server';
import { OfficeConvertError, pdfToPptxLibreOffice, safeBaseName } from '@/lib/pdfToOffice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export async function POST(request: NextRequest) {
  let file: File | null = null;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const entry = formData.get('file');
      file = entry instanceof File ? entry : null;
    } else {
      return Response.json(
        { error: 'Upload the PDF as multipart/form-data.' },
        { status: 400 },
      );
    }
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 });
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

    // LibreOffice imports the PDF into Impress (one slide per page) and exports
    // it with the PowerPoint 2007 XML filter.
    const pptx = await pdfToPptxLibreOffice(buffer);
    const filename = `${safeBaseName(file.name, 'presentation')}.pptx`;

    return new Response(new Uint8Array(pptx), {
      status: 200,
      headers: {
        'Content-Type': PPTX_MIME,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pptx.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF to PowerPoint error:', error);
    if (error instanceof OfficeConvertError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'Failed to convert PDF to PowerPoint' }, { status: 500 });
  }
}
