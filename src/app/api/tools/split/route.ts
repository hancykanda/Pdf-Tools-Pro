import { NextRequest } from 'next/server';
import {
  everyNGroups,
  parseRangeGroups,
  rangeGroup,
  extractPages,
  splitIntoParts,
  zipFiles,
  getPageCount,
  type PageGroup,
} from '@/lib/pdfPages';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

type SplitMode = 'range' | 'every' | 'custom' | 'pages';

/**
 * Split a PDF.
 *
 * Body (JSON):
 *   file          base64 / data-URL of the source PDF (required)
 *   mode          'range' | 'every' | 'custom' | 'pages'
 *   from, to      1-based bounds for mode 'range'
 *   everyN        chunk size for mode 'every'
 *   ranges        "1-3, 5, 7-9" for mode 'custom' (one output PDF per token)
 *   pages         number[] of 1-based pages for mode 'pages' (one output PDF)
 *   mergeParts    when true, custom/every produce a single merged PDF
 *   filename      original filename, used to name the parts
 *
 * Legacy body `{ file, pageIndices: number[] }` (0-based) is still supported
 * and returns a single PDF, so older clients keep working.
 *
 * Response: { dataUrl, filename, mimeType, partCount, parts: string[] }
 * `mimeType` is 'application/zip' when more than one PDF was produced.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, mode, from, to, everyN, ranges, pages, mergeParts, filename, pageIndices } = body ?? {};

    if (!file || typeof file !== 'string') {
      return Response.json({ error: 'A PDF file is required' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);
    let pageCount: number;
    try {
      pageCount = await getPageCount(bytes);
    } catch {
      return Response.json({ error: 'Could not read the PDF file' }, { status: 400 });
    }

    if (pageCount === 0) {
      return Response.json({ error: 'The PDF has no pages' }, { status: 400 });
    }

    const baseName = typeof filename === 'string' && filename.trim() ? filename : 'document';

    // ---- Legacy contract: explicit 0-based page indices, single PDF out ----
    if (!mode && Array.isArray(pageIndices)) {
      const oneBased = pageIndices
        .map((i: number) => Number(i) + 1)
        .filter((p: number) => Number.isInteger(p) && p >= 1 && p <= pageCount);

      if (oneBased.length === 0) {
        return Response.json({ error: 'File and page indices are required' }, { status: 400 });
      }

      const out = await extractPages(bytes, oneBased);
      return Response.json({
        dataUrl: bytesToBase64(out),
        filename: 'split.pdf',
        mimeType: 'application/pdf',
        partCount: 1,
        parts: ['split.pdf'],
        pageCount: oneBased.length,
      });
    }

    // ---- Mode based splitting ----
    const selectedMode: SplitMode = (['range', 'every', 'custom', 'pages'] as const).includes(mode)
      ? mode
      : 'range';

    let groups: PageGroup[] = [];

    if (selectedMode === 'range') {
      const group = rangeGroup(Number(from) || 1, Number(to) || pageCount, pageCount);
      if (group) groups = [group];
    } else if (selectedMode === 'every') {
      const n = Number(everyN);
      if (!Number.isFinite(n) || n < 1) {
        return Response.json({ error: 'Pages per file must be at least 1' }, { status: 400 });
      }
      groups = everyNGroups(pageCount, n);
    } else if (selectedMode === 'custom') {
      groups = parseRangeGroups(String(ranges ?? ''), pageCount);
      if (groups.length === 0) {
        return Response.json(
          { error: `Invalid page ranges. This PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.` },
          { status: 400 }
        );
      }
    } else {
      const selected = (Array.isArray(pages) ? pages : [])
        .map((p: unknown) => Number(p))
        .filter((p: number) => Number.isInteger(p) && p >= 1 && p <= pageCount);
      if (selected.length === 0) {
        return Response.json({ error: 'Select at least one page to extract' }, { status: 400 });
      }
      groups = [{ name: 'selected-pages', pages: [...new Set(selected)].sort((a, b) => a - b) }];
    }

    if (groups.length === 0) {
      return Response.json({ error: 'The selected range does not match any pages' }, { status: 400 });
    }

    // Optionally flatten every group into one document.
    if (mergeParts && groups.length > 1) {
      const merged = groups.flatMap((g) => g.pages);
      groups = [{ name: 'selected-pages', pages: merged }];
    }

    const parts = await splitIntoParts(bytes, groups, baseName);

    if (parts.length === 1) {
      return Response.json({
        dataUrl: bytesToBase64(parts[0].bytes),
        filename: parts[0].name,
        mimeType: 'application/pdf',
        partCount: 1,
        parts: parts.map((p) => p.name),
        pageCount: groups[0].pages.length,
      });
    }

    const zipped = await zipFiles(parts);
    const safeBase = baseName.replace(/\.pdf$/i, '').replace(/[^\w.\-]+/g, '_') || 'document';

    return Response.json({
      dataUrl: bytesToBase64(zipped, 'application/zip'),
      filename: `${safeBase}-split.zip`,
      mimeType: 'application/zip',
      partCount: parts.length,
      parts: parts.map((p) => p.name),
      pageCount,
    });
  } catch (error) {
    console.error('Split error:', error);
    const message = error instanceof Error ? error.message : 'Failed to split PDF';
    return Response.json({ error: message }, { status: 500 });
  }
}
