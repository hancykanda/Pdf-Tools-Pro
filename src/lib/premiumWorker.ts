import { Job } from 'bullmq';
import { registerPremiumWorker, type PremiumJobData, type PremiumJobResult } from './queue';
import { downloadFile, uploadFile } from './minio';
import { PDFDocument, rgb } from 'pdf-lib';
import { extractPdfText } from './pdfText';
import { generateWithGemini } from './gemini';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Server-side pdfjs worker (same setup as the working pdf-to-word route).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url,
).toString();

type PageText = { width: number; height: number; text: string };

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

async function extractPages(buffer: Buffer): Promise<PageText[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: PageText[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str?: string }>;
    const text = items.map((it) => it.str ?? '').join(' ').replace(/\s+/g, ' ').trim();
    pages.push({ width: viewport.width, height: viewport.height, text });
    await page.cleanup();
  }
  return pages;
}

function splitIntoPages(marked: string): string[] {
  const parts = marked.split(/^===PAGE\s+\d+===$/m).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [marked.trim()].filter(Boolean);
}

/** Flow edited text into a pdf-lib page, preserving the original page size. */
function drawPage(pdfDoc: PDFDocument, width: number, height: number, text: string): void {
  const page = pdfDoc.addPage([width, height]);
  const size = 11;
  const lineHeight = size * 1.4;
  const marginX = 50;
  let y = height - 50;
  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (y < 40) break; // keep within the page bounds
    page.drawText(line, {
      x: marginX,
      y,
      size,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= lineHeight;
  }
}

async function applyAiEdit(buffer: Buffer, prompt: string): Promise<Buffer> {
  // Extract text per page so we can preserve page structure/layout.
  let pages: PageText[] = [];
  try {
    pages = await extractPages(buffer);
  } catch {
    pages = [];
  }

  // Fallback: no extractable text — just annotate the prompt on a blank page.
  if (pages.length === 0) {
    const pdf = await PDFDocument.create();
    drawPage(pdf, 595.28, 841.89, `(${prompt})\n\nNo extractable text found in this PDF.`);
    return Buffer.from(await pdf.save());
  }

  const marked = pages
    .map((p, idx) => `===PAGE ${idx + 1}===\n${p.text}`)
    .join('\n\n');

  let editedPages: string[] = [];
  try {
    const edited = await generateWithGemini(
      `You are a document editor. Edit the document below according to this instruction: "${prompt}".\n` +
        `Keep the ===PAGE N=== markers exactly and return the SAME number of pages.\n` +
        `Return ONLY the marked document.\n\nDOCUMENT:\n${marked}`,
    );
    editedPages = splitIntoPages(edited);
  } catch {
    // Editing unavailable: return the original text, annotated with the request.
    editedPages = pages.map((p) => `(${prompt})\n\n${p.text}`);
  }

  // Guard against page-count drift from the model.
  if (editedPages.length !== pages.length) {
    editedPages = pages.map((p, idx) => editedPages[idx] ?? p.text);
  }

  const pdf = await PDFDocument.create();
  pages.forEach((p, idx) => drawPage(pdf, p.width, p.height, editedPages[idx] ?? p.text));
  return Buffer.from(await pdf.save());
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
  // PDF (including scanned/image-based): use Gemini's document understanding
  // for real OCR. This extracts text from rendered pages, not just an embedded
  // text layer, so scanned PDFs are handled correctly.
  if (mimeType === 'application/pdf' || buffer.slice(0, 4).toString() === '%PDF') {
    try {
      const base64 = buffer.toString('base64');
      const text = await generateWithGemini(
        'Extract all readable text from this PDF document, page by page, preserving reading order and structure. Return only the extracted text.',
        [{ mimeType: 'application/pdf', data: base64 }]
      );
      return buildTextPdf('OCR / Extracted Text', text || 'No text could be extracted from this PDF.');
    } catch {
      // Fallback to the embedded text layer when Gemini is unavailable.
      const text = await extractPdfText(buffer);
      return buildTextPdf('OCR / Extracted Text', text || 'No text layer found in this PDF.');
    }
  }
  // Image: Gemini vision OCR.
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
