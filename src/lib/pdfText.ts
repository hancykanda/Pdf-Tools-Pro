import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const text = (textContent.items as Array<{ str?: string }>)
      .map((item) => item.str || '')
      .join(' ');
    pages.push(text);
    await page.cleanup();
  }

  return pages.join('\n\n');
}

/**
 * Same extraction as `extractPdfText`, but keeps the pages separate and
 * preserves line breaks (pdf.js reports them through `hasEOL`). Used by the
 * Compare tool so the diff can be aligned line by line and page by page.
 */
export async function extractPdfPageTexts(buffer: Buffer): Promise<string[]> {
  const uint8Array = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const text = (textContent.items as Array<{ str?: string; hasEOL?: boolean }>)
      .map((item) => (item.str || '') + (item.hasEOL ? '\n' : ''))
      .join(' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n');
    pages.push(text);
    await page.cleanup();
  }

  return pages;
}
