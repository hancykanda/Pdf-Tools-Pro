import { NextRequest } from 'next/server';

import { extractPdfPageTexts } from '@/lib/pdfText';
import { diffText } from '@/lib/textDiff';
import {
  errorResponse,
  getPdfFromPayload,
  looksLikePdf,
  readToolRequest,
} from '@/lib/securityTools';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Compare PDF — pdf.js text extraction + LCS diff.
 *
 * Visual tool only: the response is JSON describing the differences, there is
 * no output file.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await readToolRequest(request);

    const bytes1 = getPdfFromPayload(payload, 'file1');
    const bytes2 = getPdfFromPayload(payload, 'file2');

    if (!bytes1 || !bytes2) {
      return errorResponse('Two PDF files are required');
    }
    if (!looksLikePdf(bytes1) || !looksLikePdf(bytes2)) {
      return errorResponse('Both uploads must be valid PDF files');
    }

    const [pages1, pages2] = await Promise.all([
      extractPdfPageTexts(Buffer.from(bytes1)),
      extractPdfPageTexts(Buffer.from(bytes2)),
    ]);

    const text1 = pages1.join('\n\n');
    const text2 = pages2.join('\n\n');

    const { rows, summary, flat } = diffText(text1, text2);

    const hasText = text1.trim().length > 0 || text2.trim().length > 0;

    return Response.json({
      text1,
      text2,
      pageCount1: pages1.length,
      pageCount2: pages2.length,
      rows,
      summary,
      identical: summary.added + summary.removed + summary.changed === 0,
      // Legacy flat shape kept so older clients keep working.
      diff: flat,
      warning: hasText
        ? undefined
        : 'No selectable text was found in these PDFs — they may be scanned images. Run OCR first for a meaningful comparison.',
    });
  } catch (error) {
    console.error('Compare error:', error);
    return errorResponse('Failed to compare PDFs', 500);
  }
}
