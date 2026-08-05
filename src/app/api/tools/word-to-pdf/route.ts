import { NextRequest } from 'next/server';
import mammoth from 'mammoth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'Word document is required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const html = htmlResult.value || '<p>Empty document</p>';

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const lines = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '').split('\n');

    for (const rawLine of lines) {
      const cleanLine = rawLine.trim();
      if (!cleanLine) {
        y -= 12;
        continue;
      }

      if (y < margin + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin - 20;
      }

      const words = cleanLine.split(' ');
      let currentLine = '';
      const selectedFont = font;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = selectedFont.widthOfTextAtSize(testLine, 12);

        if (testWidth > contentWidth && currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y,
            size: 12,
            font: selectedFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= 18;
          if (y < margin + 40) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin - 20;
          }
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y,
          size: 12,
          font: selectedFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 18;
      }
    }

    const bytes = await pdfDoc.save();
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="converted.pdf"`,
      },
    });
  } catch (error) {
    console.error('Word to PDF error:', error);
    return Response.json({ error: 'Failed to convert Word to PDF' }, { status: 500 });
  }
}