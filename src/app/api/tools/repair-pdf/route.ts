import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);
    const srcDoc = await PDFDocument.load(bytes);

    const newDoc = await PDFDocument.create();
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => {
      newDoc.addPage(page);
    });

    if (srcDoc.getTitle()) newDoc.setTitle(srcDoc.getTitle() as string);
    if (srcDoc.getAuthor()) newDoc.setAuthor(srcDoc.getAuthor() as string);
    if (srcDoc.getSubject()) newDoc.setSubject(srcDoc.getSubject() as string);
    if (srcDoc.getCreator()) newDoc.setCreator(srcDoc.getCreator() as string);

    newDoc.setProducer('pdf-tools Repair');

    const out = await newDoc.save({ useObjectStreams: true });
    const dataUrl = bytesToBase64(out);

    return Response.json({ dataUrl, filename: 'repaired.pdf', pageCount: copiedPages.length });
  } catch (error) {
    console.error('Repair error:', error);
    return Response.json({ error: 'Failed to repair PDF. The file may be too damaged to recover.' }, { status: 500 });
  }
}
