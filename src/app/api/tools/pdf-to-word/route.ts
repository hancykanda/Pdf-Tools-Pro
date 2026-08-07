import { NextRequest } from 'next/server';
import { OfficeConvertError, pdfToDocx, safeBaseName } from '@/lib/pdfToOffice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface ParsedRequest {
  pdf: Buffer;
  mode: 'layout' | 'text';
  name: string;
}

/** Accept either multipart/form-data (file + mode) or a JSON base64 payload. */
async function parseRequest(request: NextRequest): Promise<ParsedRequest | null> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const entry = formData.get('file');
    if (!(entry instanceof File) || entry.size === 0) return null;
    const mode = String(formData.get('mode') || 'layout') === 'text' ? 'text' : 'layout';
    return {
      pdf: Buffer.from(await entry.arrayBuffer()),
      mode,
      name: entry.name || 'document.pdf',
    };
  }

  const body = await request.json().catch(() => null);
  if (!body) return null;
  const base64: string | undefined = body.pdfBase64 || body.file;
  if (!base64) return null;
  const clean = base64.split(',')[1] || base64;
  const mode = body.mode === 'text' ? 'text' : 'layout';
  return {
    pdf: Buffer.from(clean, 'base64'),
    mode,
    name: typeof body.filename === 'string' ? body.filename : 'document.pdf',
  };
}

export async function POST(request: NextRequest) {
  let parsed: ParsedRequest | null = null;

  try {
    parsed = await parseRequest(request);
  } catch {
    return Response.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  if (!parsed || parsed.pdf.length === 0) {
    return Response.json({ error: 'PDF file is required' }, { status: 400 });
  }

  if (parsed.pdf.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return Response.json({ error: 'Please upload a valid PDF file' }, { status: 400 });
  }

  try {
    const { docx, engine } = await pdfToDocx(parsed.pdf, parsed.mode);
    const filename = `${safeBaseName(parsed.name, 'converted')}.docx`;

    return new Response(new Uint8Array(docx), {
      status: 200,
      headers: {
        'Content-Type': DOCX_MIME,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(docx.length),
        'X-Conversion-Engine': engine,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF to Word error:', error);
    if (error instanceof OfficeConvertError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : 'Failed to convert PDF to Word';
    return Response.json({ error: message }, { status: 500 });
  }
}
