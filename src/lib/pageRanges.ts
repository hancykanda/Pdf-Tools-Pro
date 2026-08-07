/**
 * Pure page-range helpers shared by the Organize tool family.
 *
 * Kept dependency-free on purpose: both the client pages (for live previews)
 * and the route handlers import these, so nothing heavy should live here.
 */

/** A named set of 1-based page numbers that becomes one output document. */
export interface PageGroup {
  name: string;
  pages: number[];
}

/** Normalise an arbitrary rotation value to one of 0/90/180/270. */
export function normalizeRotation(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return (((Math.round(n / 90) * 90) % 360) + 360) % 360;
}

/**
 * Parse a page selection string into one group per comma-separated token.
 * "1-3, 5, 7-9" → [{1,2,3}, {5}, {7,8,9}]. Invalid/out-of-range tokens are
 * skipped; reversed ranges ("5-2") are read in ascending order.
 */
export function parseRangeGroups(input: string, pageCount: number): PageGroup[] {
  if (!input || pageCount <= 0) return [];

  const groups: PageGroup[] = [];

  for (const raw of input.split(',')) {
    const token = raw.trim();
    if (!token) continue;

    const match = token.match(/^(\d+)\s*(?:-|–|to)\s*(\d+)$/i);
    if (match) {
      let start = Number(match[1]);
      let end = Number(match[2]);
      if (start > end) [start, end] = [end, start];
      start = Math.max(1, start);
      end = Math.min(pageCount, end);
      if (start > end) continue;

      const pages: number[] = [];
      for (let p = start; p <= end; p++) pages.push(p);
      groups.push({ name: pages.length === 1 ? `page-${start}` : `pages-${start}-${end}`, pages });
      continue;
    }

    const single = Number(token);
    if (Number.isInteger(single) && single >= 1 && single <= pageCount) {
      groups.push({ name: `page-${single}`, pages: [single] });
    }
  }

  return groups;
}

/**
 * Parse a page selection string ("1-3, 5, 7-9") into a flat, sorted, unique
 * list of 1-based page numbers clamped to the document length.
 */
export function parsePageNumbers(input: string, pageCount: number): number[] {
  const pages = parseRangeGroups(input, pageCount).flatMap((g) => g.pages);
  return [...new Set(pages)].sort((a, b) => a - b);
}

/** Split a document into consecutive chunks of `n` pages. */
export function everyNGroups(pageCount: number, n: number): PageGroup[] {
  const size = Math.max(1, Math.floor(n) || 1);
  const groups: PageGroup[] = [];

  for (let start = 1; start <= pageCount; start += size) {
    const end = Math.min(pageCount, start + size - 1);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    groups.push({ name: start === end ? `page-${start}` : `pages-${start}-${end}`, pages });
  }

  return groups;
}

/** A single contiguous range group, clamped to the document. */
export function rangeGroup(from: number, to: number, pageCount: number): PageGroup | null {
  if (pageCount <= 0) return null;

  let start = Math.max(1, Math.floor(from) || 1);
  let end = Math.min(pageCount, Math.floor(to) || pageCount);
  if (start > end) [start, end] = [end, start];
  if (start > pageCount || end < 1) return null;

  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return { name: start === end ? `page-${start}` : `pages-${start}-${end}`, pages };
}
