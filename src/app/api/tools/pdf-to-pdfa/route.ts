import { NextRequest } from 'next/server';
import { findSrgbIccProfile, gsPdfA, type PdfAConformance } from '@/lib/ghostscript';
import { which } from '@/lib/cli';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CONFORMANCE: Record<string, PdfAConformance> = {
  'pdfa-1b': 'PDF/A-1b',
  'pdfa-2b': 'PDF/A-2b',
  'pdfa-3b': 'PDF/A-3b',
  'a-1b': 'PDF/A-1b',
  'a-2b': 'PDF/A-2b',
  'a-3b': 'PDF/A-3b',
  '1b': 'PDF/A-1b',
  '2b': 'PDF/A-2b',
  '3b': 'PDF/A-3b',
  'pdf/a-1b': 'PDF/A-1b',
  'pdf/a-2b': 'PDF/A-2b',
  'pdf/a-3b': 'PDF/A-3b',
};

function normalizeConformance(value: unknown): PdfAConformance {
  const key = String(value || '').trim().toLowerCase();
  return CONFORMANCE[key] || 'PDF/A-2b';
}

interface ParsedRequest {
  pdf: Buffer;
  conformance: PdfAConformance;
  name: string;
}

async function parseRequest(request: NextRequest): Promise<ParsedRequest | null> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const entry = formData.get('file');
    if (!(entry instanceof File) || entry.size === 0) return null;
    return {
      pdf: Buffer.from(await entry.arrayBuffer()),
      conformance: normalizeConformance(formData.get('conformance')),
      name: entry.name || 'document.pdf',
    };
  }

  const body = await request.json().catch(() => null);
  if (!body?.file) return null;
  const clean = String(body.file).split(',')[1] || String(body.file);
  return {
    pdf: Buffer.from(clean, 'base64'),
    conformance: normalizeConformance(body.conformance),
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

  if (!which('gs')) {
    return Response.json(
      { error: 'Ghostscript is not installed on the server, so PDF/A conversion is unavailable.' },
      { status: 503 },
    );
  }

  try {
    const base = (parsed.name.replace(/\.[^/.]+$/, '') || 'document').replace(/[\r\n"\\/]+/g, '');
    const out = await gsPdfA(parsed.pdf, parsed.conformance, { title: base });

    if (out.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new Error('Ghostscript produced an invalid PDF');
    }

    const suffix = parsed.conformance.replace('PDF/', '').replace('/', '').toLowerCase(); // a-1b
    return new Response(new Uint8Array(out), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${base}-pdf${suffix}.pdf"`,
        'Content-Length': String(out.length),
        'X-Pdfa-Conformance': parsed.conformance,
        // Tells the UI whether a real sRGB OutputIntent could be embedded.
        'X-Pdfa-Output-Intent': findSrgbIccProfile() ? 'sRGB' : 'none',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF to PDF/A error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to convert PDF to PDF/A';
    return Response.json({ error: message }, { status: 500 });
  }
}
