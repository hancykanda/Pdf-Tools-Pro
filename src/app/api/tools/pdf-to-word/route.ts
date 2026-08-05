import { NextRequest } from 'next/server';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export const dynamic = 'force-dynamic';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

function getFontSizeFromTransform(transform: number[]): number {
  if (!transform || transform.length < 4) return 12;
  const height = Math.abs(transform[0]) || Math.abs(transform[1]) || 12;
  return Math.round(height * 0.8) || 12;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64 } = body;

    if (!pdfBase64) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const cleanBase64 = pdfBase64.split(',')[1] || pdfBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const uint8Array = new Uint8Array(buffer);

    const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
    const pagesCount = doc.numPages;
    const pages: string[] = [];

    for (let i = 1; i <= pagesCount; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as Array<{
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
      }>;

      if (items.length === 0) {
        pages.push('');
        await page.cleanup();
        continue;
      }

      const lines: Array<{ text: string; y: number; fontSize: number }> = [];
      let currentLine = '';
      let lastY = items[0].transform?.[5] ?? 0;
      let lineFontSize = getFontSizeFromTransform(items[0].transform || []);

      for (const item of items) {
        const text = item.str || '';
        if (!text) continue;
        const y = item.transform?.[5] ?? lastY;
        const fontSize = getFontSizeFromTransform(item.transform || []);

        if (Math.abs(y - lastY) > fontSize * 0.3) {
          lines.push({ text: currentLine, y: lastY, fontSize: lineFontSize });
          currentLine = '';
          lastY = y;
          lineFontSize = fontSize;
        } else if (currentLine) {
          currentLine += ' ';
        }

        currentLine += text;
        lineFontSize = Math.min(lineFontSize, fontSize) || lineFontSize;
      }

      if (currentLine) {
        lines.push({ text: currentLine, y: lastY, fontSize: lineFontSize });
      }

      const sortedLines = lines.sort((a, b) => b.y - a.y);
      const pageText = sortedLines.map((line) => {
        const trimmed = line.text.trim();
        if (!trimmed) return '';
        if (line.fontSize >= 18) return `# ${trimmed}`;
        if (line.fontSize >= 14) return `## ${trimmed}`;
        if (line.fontSize >= 12) return trimmed;
        return `> ${trimmed}`;
      }).join('\n');

      pages.push(pageText);
      await page.cleanup();
    }

    const fullText = pages.join('\n\n---\n\n');

    return Response.json({
      text: fullText.trim() || 'No text could be extracted from this PDF.',
      pagesCount,
    });
  } catch (error) {
    console.error('PDF extract error:', error);
    return Response.json({ error: 'Failed to extract text from PDF' }, { status: 500 });
  }
}
