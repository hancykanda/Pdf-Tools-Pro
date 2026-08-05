import { Job } from 'bullmq';
import { registerPremiumWorker, type PremiumJobData, type PremiumJobResult } from './queue';
import { downloadFile, uploadFile } from './minio';
import { PDFDocument, rgb } from 'pdf-lib';
import { extractPdfText } from './pdfText';
import { generateWithGemini } from './gemini';

async function streamToBuffer(stream: AsyncIterable<Buffer> | NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const chunk of stream as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function chunkText(text: string, maxChars = 90): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function buildTextPdf(title: string, body: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont('Helvetica');
  const bold = await pdfDoc.embedFont('Helvetica-Bold');
  let page = pdfDoc.addPage([595.28, 841.89]);
  let y = 800;

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
    }
  };

  if (title) {
    page.drawText(title, { x: 50, y, size: 16, font: bold, color: rgb(0.1, 0.1, 0.1) });
    y -= 30;
  }

  for (const para of body.split(/\n{2,}/).length ? body.split(/\n{2,}/) : [body]) {
    for (const line of chunkText(para)) {
      ensureSpace(18);
      page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0.15, 0.15, 0.15) });
      y -= 18;
    }
    y -= 10;
  }

  return Buffer.from(await pdfDoc.save());
}

async function applyAiEdit(buffer: Buffer, prompt: string): Promise<Buffer> {
  const sourceText = await extractPdfText(buffer);
  let edited = sourceText;
  try {
    edited = await generateWithGemini(
      `You are a document editor. Rewrite the document below according to this instruction: "${prompt}".\n\nReturn ONLY the full edited document text, preserving structure as plain text.\n\nORIGINAL:\n${sourceText}`
    );
  } catch {
    edited = `(${prompt})\n\n${sourceText}`;
  }
  return buildTextPdf('AI Edited Document', edited);
}

async function applyHeader(buffer: Buffer, headerText: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { height } = page.getSize();
    page.drawText(headerText, {
      x: 40,
      y: height - 40,
      size: 11,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
  return Buffer.from(await pdfDoc.save());
}

async function applyOcr(buffer: Buffer, mimeType: string): Promise<Buffer> {
  // PDF: extract embedded text layer.
  if (mimeType === 'application/pdf' || buffer.slice(0, 4).toString() === '%PDF') {
    const text = await extractPdfText(buffer);
    return buildTextPdf('OCR / Extracted Text', text || 'No text layer found in this PDF.');
  }
  // Image: attempt Gemini vision OCR if a key is configured.
  try {
    const base64 = buffer.toString('base64');
    const text = await generateWithGemini(
      'Extract all readable text from this image. Return the text content only, preserving structure.',
      [{ mimeType: mimeType || 'image/png', data: base64 }]
    );
    return buildTextPdf('OCR / Extracted Text', text);
  } catch {
    throw new Error('OCR requires a configured GEMINI_API_KEY for image input.');
  }
}

async function applyReorder(buffer: Buffer, pageOrder: string): Promise<Buffer> {
  const src = await PDFDocument.load(buffer);
  const total = src.getPages().length;

  let parsed: unknown;
  try {
    parsed = JSON.parse(pageOrder);
  } catch {
    parsed = pageOrder.split(',');
  }
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const order = arr
    .map((n) => parseInt(String(n), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= total)
    .map((n) => n - 1);

  if (order.length === 0) return buffer;

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save());
}

async function handleJob(job: Job<PremiumJobData, PremiumJobResult, string>): Promise<PremiumJobResult> {
  const data = job.data;
  const tool = String(data.tool || '');
  const objectName = String(data.objectName || '');
  const fileName = String(data.fileName || 'document.pdf');
  const userId = String(data.userId || '');
  const mimeType = String(data.mimeType || 'application/pdf');

  if (!objectName) {
    throw new Error('Job missing objectName');
  }

  // exam-generator already produced the final PDF in its route; reuse it.
  if (tool === 'exam-generator') {
    return { objectName, fileName: 'exam.pdf', tool };
  }

  const sourceBuffer = await streamToBuffer(await downloadFile(objectName));

  let resultBuffer: Buffer;
  switch (tool) {
    case 'ai-editor':
      resultBuffer = await applyAiEdit(sourceBuffer, String(data.prompt || ''));
      break;
    case 'exam-header':
      resultBuffer = await applyHeader(sourceBuffer, String(data.headerText || 'Header'));
      break;
    case 'ocr':
      resultBuffer = await applyOcr(sourceBuffer, mimeType);
      break;
    case 'ocr-organize': {
      resultBuffer = sourceBuffer;
      if (data.pageOrder) {
        resultBuffer = await applyReorder(sourceBuffer, String(data.pageOrder));
      }
      // OCR step if input is an image/scan
      if (mimeType !== 'application/pdf' && !sourceBuffer.slice(0, 4).toString().startsWith('%PDF')) {
        resultBuffer = await applyOcr(sourceBuffer, mimeType);
      } else {
        resultBuffer = await applyOcr(sourceBuffer, 'application/pdf');
      }
      break;
    }
    default:
      throw new Error(`Unknown premium tool: ${tool}`);
  }

  const resultObjectName = `${userId}/${tool}/result_${Date.now()}_${fileName}`;
  await uploadFile(
    resultObjectName,
    resultBuffer,
    resultBuffer.length,
    'application/pdf',
    { uploadedBy: userId, originalName: fileName }
  );

  return { objectName: resultObjectName, fileName, tool };
}

// Register the worker so premium jobs actually process (no separate worker service exists).
registerPremiumWorker(handleJob);
