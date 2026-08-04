import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html } = body;

    if (!html || typeof html !== 'string') {
      return Response.json({ error: 'HTML content is required' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    const plainText = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+(>|$)/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    const lines = plainText.split('\n');

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

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
      const selectedFont = /^#{1,6}\s/.test(rawLine.trim()) || /^<h[1-6]/i.test(rawLine) ? boldFont : font;
      const fontSize = /^#{1,2}\s/.test(rawLine.trim()) ? 16 : /^#{3,4}\s/.test(rawLine.trim()) ? 14 : /^#{5,6}\s/.test(rawLine.trim()) ? 12 : 11;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = selectedFont.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > contentWidth && currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font: selectedFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= fontSize + 4;
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
          size: fontSize,
          font: selectedFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= fontSize + 4;
      }
    }

    const bytes = await pdfDoc.save();
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="converted.pdf"',
      },
    });
  } catch (error) {
    console.error('HTML to PDF error:', error);
    return Response.json({ error: 'Failed to convert HTML to PDF' }, { status: 500 });
  }
}
