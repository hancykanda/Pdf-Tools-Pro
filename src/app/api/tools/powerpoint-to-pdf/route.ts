import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

const PAGE_WIDTH = 720; // 10in x 7.5in slide-like landscape page
const PAGE_HEIGHT = 540;
const MARGIN = 48;
const BODY_SIZE = 14;
const LINE_HEIGHT = 20;

/** pdf-lib standard fonts use WinAnsi encoding; drop anything it cannot encode. */
function sanitize(value: string): string {
  return value
    .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2000-\u200B]/g, ' ')
    .replace(/[^\u0020-\u007E\u00A1-\u00FF]/g, '?');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&');
}

/** Pull the visible text of a slide, one entry per <a:p> paragraph. */
function slideParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  const paragraphMatches = xml.match(/<a:p\b[\s\S]*?<\/a:p>/g) || [];

  for (const paragraph of paragraphMatches) {
    const runs = paragraph.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [];
    const text = runs
      .map((run) => decodeXmlEntities(run.replace(/<\/?a:t>/g, '')))
      .join('')
      .replace(/[\r\n\t]+/g, ' ')
      .trim();
    if (text) paragraphs.push(sanitize(text));
  }

  return paragraphs;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);

    // A single word longer than the line: hard-split it.
    let remainder = word;
    while (font.widthOfTextAtSize(remainder, size) > maxWidth && remainder.length > 1) {
      let cut = remainder.length;
      while (cut > 1 && font.widthOfTextAtSize(remainder.slice(0, cut), size) > maxWidth) cut--;
      lines.push(remainder.slice(0, cut));
      remainder = remainder.slice(cut);
    }
    line = remainder;
  }

  if (line) lines.push(line);
  return lines;
}

export async function POST(request: NextRequest) {
  let file: File | null = null;

  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
  } catch {
    return Response.json({ error: 'Invalid form data. Upload the presentation as multipart/form-data.' }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return Response.json({ error: 'PowerPoint file is required' }, { status: 400 });
  }

  const validTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  const validExts = ['.ppt', '.pptx'];
  const hasValidType = validTypes.includes(file.type);
  const hasValidExt = validExts.some((ext) => file!.name.toLowerCase().endsWith(ext));

  if (!hasValidType && !hasValidExt) {
    return Response.json({ error: 'Please upload a valid PowerPoint file (.ppt or .pptx)' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.subarray(0, 2).toString('latin1') !== 'PK') {
      return Response.json(
        { error: 'Legacy binary .ppt files are not supported. Please save the presentation as .pptx and try again.' },
        { status: 400 }
      );
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch {
      return Response.json({ error: 'Could not read the uploaded presentation. It may be corrupted.' }, { status: 400 });
    }

    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const na = parseInt(a.replace(/\D+/g, ''), 10);
        const nb = parseInt(b.replace(/\D+/g, ''), 10);
        return na - nb;
      });

    if (slideFiles.length === 0) {
      return Response.json({ error: 'No slides were found in the uploaded presentation' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const usableWidth = PAGE_WIDTH - MARGIN * 2;

    for (let i = 0; i < slideFiles.length; i++) {
      const xml = await zip.files[slideFiles[i]].async('string');
      const paragraphs = slideParagraphs(xml);

      let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let cursorY = PAGE_HEIGHT - MARGIN;

      const drawHeader = (label: string) => {
        page.drawText(label, {
          x: MARGIN,
          y: cursorY - 16,
          size: 16,
          font: boldFont,
          color: rgb(0.12, 0.16, 0.2),
        });
        page.drawLine({
          start: { x: MARGIN, y: cursorY - 26 },
          end: { x: PAGE_WIDTH - MARGIN, y: cursorY - 26 },
          thickness: 0.8,
          color: rgb(0.8, 0.8, 0.84),
        });
        cursorY -= 46;
      };

      drawHeader(`Slide ${i + 1}`);

      if (paragraphs.length === 0) {
        page.drawText('(this slide contains no text)', {
          x: MARGIN,
          y: cursorY - BODY_SIZE,
          size: BODY_SIZE,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        continue;
      }

      const [firstParagraph, ...rest] = paragraphs;

      // First paragraph acts as the slide title.
      for (const line of wrapText(firstParagraph, boldFont, 20, usableWidth)) {
        if (cursorY - 26 < MARGIN) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          cursorY = PAGE_HEIGHT - MARGIN;
          drawHeader(`Slide ${i + 1} (cont.)`);
        }
        page.drawText(line, { x: MARGIN, y: cursorY - 20, size: 20, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
        cursorY -= 26;
      }
      cursorY -= 10;

      for (const paragraph of rest) {
        const lines = wrapText(paragraph, font, BODY_SIZE, usableWidth - 14);
        for (let l = 0; l < lines.length; l++) {
          if (cursorY - LINE_HEIGHT < MARGIN) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            cursorY = PAGE_HEIGHT - MARGIN;
            drawHeader(`Slide ${i + 1} (cont.)`);
          }
          if (l === 0) {
            page.drawCircle({ x: MARGIN + 3, y: cursorY - BODY_SIZE + 4, size: 2, color: rgb(0.45, 0.45, 0.5) });
          }
          page.drawText(lines[l], {
            x: MARGIN + 14,
            y: cursorY - BODY_SIZE,
            size: BODY_SIZE,
            font,
            color: rgb(0.2, 0.2, 0.22),
          });
          cursorY -= LINE_HEIGHT;
        }
        cursorY -= 6;
      }
    }

    const bytes = await pdfDoc.save();
    const outName = `${file.name.replace(/\.[^/.]+$/, '') || 'presentation'}.pdf`;

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PowerPoint to PDF error:', error);
    return Response.json({ error: 'Failed to convert PowerPoint to PDF' }, { status: 500 });
  }
}
