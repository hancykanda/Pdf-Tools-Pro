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
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const ensureSpace = (needed: number) => {
      if (y - needed < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };

    const drawLine = (text: string, x: number, yPos: number, size: number, f: typeof font, color = rgb(0.1, 0.1, 0.1)) => {
      ensureSpace(size + 4);
      page.drawText(text, { x, y: yPos, size, font: f, color });
    };

    const parseHtmlToLines = (html: string): Array<{ text: string; size: number; font: typeof font; bold?: boolean; italic?: boolean; spacing: number }> => {
      const lines: Array<{ text: string; size: number; font: typeof font; bold?: boolean; italic?: boolean; spacing: number }> = [];

      const tokenRegex = /<h1[^>]*>(.*?)<\/h1>|<h2[^>]*>(.*?)<\/h2>|<h3[^>]*>(.*?)<\/h3>|<p[^>]*>(.*?)<\/p>|<li[^>]*>(.*?)<\/li>|<strong>(.*?)<\/strong>|<b>(.*?)<\/b>|<em>(.*?)<\/em>|<i>(.*?)<\/i>|(<br\s*\/?>)|<[^>]+>/gim;
      let match: RegExpExecArray | null;

      while ((match = tokenRegex.exec(html)) !== null) {
        const [, h1, h2, h3, p, li, strong, b, em, i, br] = match;

        if (h1) {
          lines.push({ text: h1.replace(/<[^>]+>/g, '').trim(), size: 24, font: boldFont, bold: true, spacing: 18 });
        } else if (h2) {
          lines.push({ text: h2.replace(/<[^>]+>/g, '').trim(), size: 20, font: boldFont, bold: true, spacing: 16 });
        } else if (h3) {
          lines.push({ text: h3.replace(/<[^>]+>/g, '').trim(), size: 16, font: boldFont, bold: true, spacing: 14 });
        } else if (p) {
          const text = p.replace(/<[^>]+>/g, '').trim();
          if (text) lines.push({ text, size: 12, font, spacing: 14 });
        } else if (li) {
          const text = li.replace(/<[^>]+>/g, '').trim();
          if (text) lines.push({ text: `• ${text}`, size: 12, font, spacing: 12 });
        } else if (strong || b) {
          const text = (strong || b || '').replace(/<[^>]+>/g, '').trim();
          if (text) lines.push({ text, size: 12, font: boldFont, bold: true, spacing: 12 });
        } else if (em || i) {
          const text = (em || i || '').replace(/<[^>]+>/g, '').trim();
          if (text) lines.push({ text, size: 12, font: italicFont, italic: true, spacing: 12 });
        } else if (br) {
          lines.push({ text: '', size: 12, font, spacing: 8 });
        }
      }

      return lines;
    };

    const lines = parseHtmlToLines(html);

    for (const line of lines) {
      const cleanText = line.text.trim();
      if (!cleanText) {
        y -= line.spacing;
        continue;
      }

      if (y < margin + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      const words = cleanText.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = line.font.widthOfTextAtSize(testLine, line.size);

        if (testWidth > contentWidth && currentLine) {
          drawLine(currentLine, margin, y, line.size, line.font);
          y -= line.spacing;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        drawLine(currentLine, margin, y, line.size, line.font);
        y -= line.spacing;
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
