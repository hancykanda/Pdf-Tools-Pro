import { NextRequest } from 'next/server';
import {
  LibreOfficeError,
  convertOfficeToPdf,
  fileExtension,
  pdfFilenameFor,
} from '@/lib/libreoffice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = ['doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'ott', 'rtf', 'txt'];

export async function POST(request: NextRequest) {
  let file: File | null = null;

  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
  } catch {
    return Response.json(
      { error: 'Invalid form data. Upload the document as multipart/form-data.' },
      { status: 400 },
    );
  }

  if (!file || file.size === 0) {
    return Response.json({ error: 'Word document is required' }, { status: 400 });
  }

  const ext = fileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: 'Please upload a valid Word document (.doc, .docx, .odt, .rtf or .txt)' },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdf = await convertOfficeToPdf(buffer, { filename: file.name });
    const outName = pdfFilenameFor(file.name, 'document');

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
    console.error('Word to PDF error:', error);
    return Response.json({ error: 'Failed to convert Word to PDF' }, { status: 500 });
  }
}
