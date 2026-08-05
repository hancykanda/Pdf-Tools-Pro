import { NextRequest } from 'next/server';
import PptxGenJS from 'pptxgenjs';
import { extractPdfText } from '@/lib/pdfText';

export const dynamic = 'force-dynamic';

const MAX_CHARS_PER_SLIDE = 1400;

/** Remove characters that are illegal inside OOXML text nodes. */
function sanitize(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Split a page's text into slide-sized chunks, breaking on whitespace when possible. */
function chunkText(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let rest = text;

  while (rest.length > limit) {
    let cut = rest.lastIndexOf(' ', limit);
    if (cut < limit * 0.6) cut = limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

export async function POST(request: NextRequest) {
  let file: File | null = null;

  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
  } catch {
    return Response.json({ error: 'Invalid form data. Upload the PDF as multipart/form-data.' }, { status: 400 });
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

    let rawText: string;
    try {
      rawText = await extractPdfText(buffer);
    } catch {
      return Response.json({ error: 'Could not read the uploaded PDF' }, { status: 400 });
    }

    // extractPdfText joins pages with a blank line, one entry per PDF page.
    const pages = rawText.split('\n\n').map(sanitize);

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.title = file.name.replace(/\.[^/.]+$/, '');

    const addSlide = (title: string, body: string) => {
      const slide = pptx.addSlide();
      slide.addText(title, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.6,
        fontSize: 22,
        bold: true,
        color: '1F2933',
      });
      slide.addText(body, {
        x: 0.5,
        y: 1.1,
        w: 9,
        h: 4.1,
        fontSize: 14,
        color: '3E4C59',
        valign: 'top',
        shrinkText: true,
      });
    };

    pages.forEach((pageText, index) => {
      if (!pageText) {
        addSlide(`Page ${index + 1}`, '(no selectable text on this PDF page)');
        return;
      }
      const chunks = chunkText(pageText, MAX_CHARS_PER_SLIDE);
      chunks.forEach((chunk, chunkIndex) => {
        const title = chunks.length > 1 ? `Page ${index + 1} (${chunkIndex + 1}/${chunks.length})` : `Page ${index + 1}`;
        addSlide(title, chunk);
      });
    });

    if (pages.length === 0) {
      addSlide('No content', 'No selectable text could be extracted from this PDF.');
    }

    const out = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
    const outName = `${file.name.replace(/\.[^/.]+$/, '') || 'presentation'}.pptx`;

    return new Response(new Uint8Array(out), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${outName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF to PowerPoint error:', error);
    return Response.json({ error: 'Failed to convert PDF to PowerPoint' }, { status: 500 });
  }
}
