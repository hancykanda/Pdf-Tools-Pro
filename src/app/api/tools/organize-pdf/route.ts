import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, pageOrder } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const indices = Array.isArray(pageOrder) ? pageOrder : null;
    if (!indices || indices.length === 0) {
      return Response.json({ error: 'A page order is required' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);
    const srcDoc = await PDFDocument.load(bytes);

    const newDoc = await PDFDocument.create();
    const pageIndices = indices.map((n: number) => n - 1);
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => {
      newDoc.addPage(page);
    });

    const out = await newDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({ dataUrl, filename: 'organized.pdf', pageCount: copiedPages.length });
  } catch (error) {
    console.error('Organize error:', error);
    return Response.json({ error: 'Failed to organize PDF' }, { status: 500 });
  }
}
