import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { extractPdfText } from '@/lib/pdfText';
import { base64ToBytes } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

interface Upload {
  buffer: Buffer;
  filename: string;
}

async function readUpload(request: NextRequest): Promise<Upload | { error: string }> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const entry = formData.get('file');
    if (!(entry instanceof File) || entry.size === 0) {
      return { error: 'PDF file is required' };
    }
    return { buffer: Buffer.from(await entry.arrayBuffer()), filename: entry.name || 'document.pdf' };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: 'Invalid request body' };
  }

  const { file, filename } = (body || {}) as { file?: unknown; filename?: unknown };
  if (typeof file !== 'string' || file.length === 0) {
    return { error: 'PDF file is required' };
  }

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(file);
  } catch {
    return { error: 'Could not decode the uploaded PDF' };
  }

  if (bytes.length === 0) {
    return { error: 'The uploaded PDF is empty' };
  }

  return {
    buffer: Buffer.from(bytes),
    filename: typeof filename === 'string' && filename ? filename : 'document.pdf',
  };
}

export async function POST(request: NextRequest) {
  try {
    const upload = await readUpload(request);
    if ('error' in upload) {
      return Response.json({ error: upload.error }, { status: 400 });
    }

    const { buffer, filename } = upload;

    let pageCount = 0;
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } catch {
      return Response.json({ error: 'Could not parse the uploaded PDF' }, { status: 400 });
    }

    if (pageCount === 0) {
      return Response.json({ error: 'The uploaded PDF contains no pages' }, { status: 400 });
    }

    let extracted = '';
    try {
      extracted = (await extractPdfText(buffer)).trim();
    } catch (error) {
      console.error('OCR text extraction error:', error);
      return Response.json({ error: 'Could not read text from the uploaded PDF' }, { status: 400 });
    }

    const pages = extracted ? extracted.split('\n\n') : [];
    const header = [
      `Text extraction for: ${filename}`,
      `Pages: ${pageCount}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'Note: this file contains the text layer that is already embedded in the PDF.',
      'No optical character recognition (OCR) was performed on page images.',
      '='.repeat(72),
      '',
    ].join('\n');

    let body: string;
    if (!extracted) {
      body = [
        'No embedded text was found in this PDF.',
        '',
        'The document is most likely a scan (page images only). Recognising text from',
        'images requires an OCR engine, which is not available on this server, so no',
        'text could be produced for this file.',
      ].join('\n');
    } else {
      body = pages
        .map((pageText, index) => {
          const clean = pageText.replace(/[ \t]+/g, ' ').trim();
          return `--- Page ${index + 1} ---\n${clean || '(no text on this page)'}`;
        })
        .join('\n\n');
    }

    const outName = `${filename.replace(/\.[^/.]+$/, '') || 'document'}.txt`;

    return new Response(Buffer.from(`${header}${body}\n`, 'utf-8'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${outName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json({ error: 'Failed to process OCR request' }, { status: 500 });
  }
}
