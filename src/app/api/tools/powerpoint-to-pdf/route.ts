import { NextRequest } from 'next/server';
import {
  LibreOfficeError,
  convertOfficeToPdf,
  fileExtension,
  pdfFilenameFor,
} from '@/lib/libreoffice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = ['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'pot', 'potx', 'odp', 'otp'];

export async function POST(request: NextRequest) {
  let file: File | null = null;

  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
  } catch {
    return Response.json(
      { error: 'Invalid form data. Upload the presentation as multipart/form-data.' },
      { status: 400 },
    );
  }

  if (!file || file.size === 0) {
    return Response.json({ error: 'PowerPoint file is required' }, { status: 400 });
  }

  const ext = fileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: 'Please upload a valid PowerPoint file (.ppt, .pptx or .odp)' },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdf = await convertOfficeToPdf(buffer, { filename: file.name });
    const outName = pdfFilenameFor(file.name, 'presentation');

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outName}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof LibreOfficeError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('PowerPoint to PDF error:', error);
    return Response.json({ error: 'Failed to convert PowerPoint to PDF' }, { status: 500 });
  }
}
