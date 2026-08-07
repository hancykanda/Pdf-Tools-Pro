/**
 * Table extraction for the "PDF to Excel" tool.
 *
 * pdf.js gives us every text run with its position on the page, so rows are
 * rebuilt by clustering runs with a similar baseline (y) and columns by
 * clustering the x positions of the resulting cells. That is enough to turn
 * ruled/whitespace-aligned tables in a text PDF into real spreadsheet cells.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url,
).toString();

export type Cell = string | number;

export interface PageTable {
  /** 1-based page number. */
  page: number;
  /** Rows of the detected table (or of the plain text fallback). */
  rows: Cell[][];
  /** True when at least one multi-column row was found on this page. */
  hasTable: boolean;
}

export interface ExtractOptions {
  /** 1-based pages to inspect. Empty/omitted = every page. */
  pages?: number[];
  /** Keep only rows that look tabular (2+ columns). Default true. */
  tablesOnly?: boolean;
}

interface TextRun {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Parse "1-3, 5, 8-10" into a sorted list of unique 1-based page numbers. */
export function parsePageRange(input: string | null | undefined, pageCount: number): number[] {
  if (!input || !input.trim()) return [];
  const out = new Set<number>();

  for (const token of input.split(',')) {
    const part = token.trim();
    if (!part) continue;

    const range = part.match(/^(\d+)\s*(?:-|–|to)\s*(\d+)$/i);
    if (range) {
      let [start, end] = [Number(range[1]), Number(range[2])];
      if (start > end) [start, end] = [end, start];
      for (let p = Math.max(1, start); p <= Math.min(pageCount, end); p++) out.add(p);
      continue;
    }

    const open = part.match(/^(\d+)\s*-\s*$/); // "5-" => 5..end
    if (open) {
      for (let p = Math.max(1, Number(open[1])); p <= pageCount; p++) out.add(p);
      continue;
    }

    const single = Number(part);
    if (Number.isInteger(single) && single >= 1 && single <= pageCount) out.add(single);
  }

  return [...out].sort((a, b) => a - b);
}

/** Numeric-looking strings become real numbers so Excel can sum them. */
function coerce(value: string): Cell {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const numeric = trimmed.replace(/[\s,]/g, '');
  if (/^-?\d+(\.\d+)?%$/.test(numeric)) return trimmed;
  if (/^-?\$?\d+(\.\d+)?$/.test(numeric)) {
    const n = Number(numeric.replace('$', ''));
    if (Number.isFinite(n)) return n;
  }
  return trimmed;
}

/** Group text runs that share a baseline into visual lines (top to bottom). */
function groupIntoLines(runs: TextRun[]): TextRun[][] {
  const sorted = [...runs].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextRun[][] = [];

  for (const run of sorted) {
    const tolerance = Math.max(2, (run.height || 10) * 0.5);
    const line = lines[lines.length - 1];
    const lineY = line?.[0]?.y;
    if (line && lineY !== undefined && Math.abs(lineY - run.y) <= tolerance) {
      line.push(run);
    } else {
      lines.push([run]);
    }
  }

  return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

/** Merge runs of one line into cells, splitting where a visible gap appears. */
function lineToCells(line: TextRun[]): { text: string; x: number }[] {
  const cells: { text: string; x: number; end: number }[] = [];

  for (const run of line) {
    const text = run.str;
    if (!text.trim()) continue;

    const last = cells[cells.length - 1];
    // A gap wider than roughly one space character starts a new cell.
    const gapLimit = Math.max(3, (run.height || 10) * 0.6);
    if (last && run.x - last.end <= gapLimit) {
      last.text += (run.x - last.end > 0.8 ? ' ' : '') + text;
      last.end = run.x + run.width;
    } else {
      cells.push({ text, x: run.x, end: run.x + run.width });
    }
  }

  return cells.map(({ text, x }) => ({ text: text.replace(/\s+/g, ' ').trim(), x }));
}

/** Cluster the x positions used on a page into column anchors. */
function buildColumns(rows: { text: string; x: number }[][]): number[] {
  const xs = rows.flatMap((row) => row.map((c) => c.x)).sort((a, b) => a - b);
  const columns: number[] = [];

  for (const x of xs) {
    const last = columns[columns.length - 1];
    if (last === undefined || x - last > 12) columns.push(x);
  }

  return columns;
}

/** Snap a page's cells onto the shared column grid. */
function toGrid(rows: { text: string; x: number }[][], columns: number[]): Cell[][] {
  return rows.map((row) => {
    const out: string[] = new Array(columns.length).fill('');
    for (const cell of row) {
      let index = 0;
      let best = Infinity;
      columns.forEach((cx, i) => {
        const distance = Math.abs(cx - cell.x);
        if (distance < best) {
          best = distance;
          index = i;
        }
      });
      out[index] = out[index] ? `${out[index]} ${cell.text}` : cell.text;
    }
    // Drop trailing empties so the sheet is not padded with blank columns.
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.map(coerce);
  });
}

/** Extract per-page tables (with a plain-line fallback) from a PDF buffer. */
export async function extractTables(
  buffer: Buffer,
  opts: ExtractOptions = {},
): Promise<{ pageCount: number; tables: PageTable[] }> {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;
  const pageCount: number = doc.numPages;
  const wanted =
    opts.pages && opts.pages.length
      ? opts.pages.filter((p) => p >= 1 && p <= pageCount)
      : Array.from({ length: pageCount }, (_, i) => i + 1);

  const tablesOnly = opts.tablesOnly !== false;
  const tables: PageTable[] = [];

  for (const pageNumber of wanted) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    const runs: TextRun[] = (
      content.items as Array<{
        str?: string;
        width?: number;
        height?: number;
        transform?: number[];
      }>
    )
      .filter((item) => typeof item.str === 'string' && item.str.trim() !== '')
      .map((item) => ({
        str: item.str as string,
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0,
        width: item.width ?? 0,
        height: item.height || Math.abs(item.transform?.[3] ?? 10),
      }));

    await page.cleanup();

    const lines = groupIntoLines(runs).map(lineToCells).filter((line) => line.length > 0);
    const tabular = lines.filter((line) => line.length >= 2);
    const hasTable = tabular.length >= 2;

    const source = hasTable && tablesOnly ? tabular : lines;
    if (source.length === 0) continue;

    const columns = buildColumns(source);
    tables.push({ page: pageNumber, rows: toGrid(source, columns), hasTable });
  }

  await loadingTask.destroy();
  return { pageCount, tables };
}
