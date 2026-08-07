import { NextRequest } from 'next/server';
import {
  LibreOfficeError,
  convertOfficeToPdf,
  fileExtension,
  pdfFilenameFor,
} from '@/lib/libreoffice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = ['xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'ods', 'ots', 'csv', 'tsv'];

export async function POST(request: NextRequest) {
  let file: File | null = null;

  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
  } catch {
    return Response.json(
      { error: 'Invalid form data. Upload the spreadsheet as multipart/form-data.' },
      { status: 400 },
    );
  }

  if (!file || file.size === 0) {
    return Response.json({ error: 'Excel file is required' }, { status: 400 });
  }

  const ext = fileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: 'Please upload a valid Excel file (.xls, .xlsx, .ods or .csv)' },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdf = await convertOfficeToPdf(buffer, { filename: file.name });
    const outName = pdfFilenameFor(file.name, 'spreadsheet');

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
    console.error('Excel to PDF error:', error);
    return Response.json({ error: 'Failed to convert Excel to PDF' }, { status: 500 });
  }
}
