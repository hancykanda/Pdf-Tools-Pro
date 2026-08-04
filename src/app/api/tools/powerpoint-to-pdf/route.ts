import { NextRequest } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

async function createPlaceholderPdf(filename: string, toolName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const drawCentered = (text: string, y: number, size: number, f: typeof boldFont | typeof font) => {
    const textWidth = f.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y,
      size,
      font: f,
      color: rgb(0.16, 0.16, 0.16),
    });
  };

  drawCentered('PDF Tools', pageHeight - 100, 28, boldFont);
  drawCentered(toolName, pageHeight - 140, 18, boldFont);

  const drawGrayCentered = (text: string, y: number, size: number) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y,
      size,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  };

  drawGrayCentered(`File received: ${filename}`, pageHeight - 200, 12);
  drawGrayCentered('Conversion is being processed. This is a placeholder PDF.', pageHeight - 220, 12);
  drawGrayCentered('Full conversion will be available in a future update.', pageHeight - 240, 12);

  return pdfDoc.save();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'PowerPoint file is required' }, { status: 400 });
    }

    const validTypes = [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    const validExts = ['.ppt', '.pptx'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExt) {
      return Response.json({ error: 'Please upload a valid PowerPoint file (.ppt or .pptx)' }, { status: 400 });
    }

    const bytes = await createPlaceholderPdf(file.name, 'PowerPoint to PDF');
    const buffer = Buffer.from(bytes);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, '')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PowerPoint to PDF error:', error);
    return Response.json({ error: 'Failed to convert PowerPoint to PDF' }, { status: 500 });
  }
}
