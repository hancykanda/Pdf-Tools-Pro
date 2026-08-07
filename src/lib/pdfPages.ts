/**
 * Page-level PDF operations shared by the "Organize" tool family
 * (split / remove pages / extract pages / organize-reorder).
 *
 * Everything here is pure `pdf-lib` (plus `jszip` for multi-file output) so it
 * runs both in a route handler and in a plain Node script.
 */
import JSZip from 'jszip';
import { PDFDocument, degrees } from 'pdf-lib';
import { normalizeRotation, type PageGroup } from './pageRanges';

export {
  everyNGroups,
  normalizeRotation,
  parsePageNumbers,
  parseRangeGroups,
  rangeGroup,
} from './pageRanges';
export type { PageGroup } from './pageRanges';

/** One entry of an organize plan: which source page, and how much to rotate it. */
export interface PagePlanItem {
  /** 1-based page number in the source document. */
  page: number;
  /** Extra rotation applied on top of the page's existing rotation (degrees). */
  rotation?: number;
}

export interface OutputFile {
  name: string;
  bytes: Uint8Array;
}

/** Load a PDF, tolerating documents with slightly broken xref tables. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
}

/** Number of pages in a PDF buffer. Throws if the file cannot be parsed. */
export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await loadPdf(bytes);
  return doc.getPageCount();
}

/**
 * Build a new document from a plan of (source page, extra rotation) entries.
 * Pages may repeat — duplicating a page is a valid organize operation.
 */
export async function buildPdfFromPlan(bytes: Uint8Array, plan: PagePlanItem[]): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const total = src.getPageCount();

  const cleaned = plan.filter((item) => Number.isInteger(item.page) && item.page >= 1 && item.page <= total);
  if (cleaned.length === 0) {
    throw new Error('No valid pages were selected');
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    cleaned.map((item) => item.page - 1)
  );

  copied.forEach((page, i) => {
    const extra = normalizeRotation(cleaned[i].rotation ?? 0);
    if (extra !== 0) {
      const current = normalizeRotation(page.getRotation().angle);
      page.setRotation(degrees((current + extra) % 360));
    }
    out.addPage(page);
  });

  return out.save();
}

/** Keep only the given 1-based pages, in ascending document order. */
export async function extractPages(bytes: Uint8Array, pages: number[]): Promise<Uint8Array> {
  const unique = [...new Set(pages)].sort((a, b) => a - b);
  return buildPdfFromPlan(
    bytes,
    unique.map((page) => ({ page }))
  );
}

/** Drop the given 1-based pages, keeping everything else in order. */
export async function removePages(bytes: Uint8Array, pages: number[]): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const total = src.getPageCount();
  const drop = new Set(pages.filter((p) => Number.isInteger(p) && p >= 1 && p <= total));

  if (drop.size === 0) throw new Error('No pages were selected for removal');
  if (drop.size >= total) throw new Error('You cannot remove every page of the document');

  const keep: number[] = [];
  for (let p = 1; p <= total; p++) if (!drop.has(p)) keep.push(p);

  return buildPdfFromPlan(
    bytes,
    keep.map((page) => ({ page }))
  );
}

/** Turn page groups into one PDF per group. */
export async function splitIntoParts(
  bytes: Uint8Array,
  groups: PageGroup[],
  baseName = 'document'
): Promise<OutputFile[]> {
  if (groups.length === 0) throw new Error('No page ranges to split');

  const safeBase = baseName.replace(/\.pdf$/i, '').replace(/[^\w.\-]+/g, '_') || 'document';
  const files: OutputFile[] = [];

  for (const group of groups) {
    if (group.pages.length === 0) continue;
    const out = await extractPages(bytes, group.pages);
    files.push({ name: `${safeBase}-${group.name}.pdf`, bytes: out });
  }

  if (files.length === 0) throw new Error('No page ranges to split');
  return files;
}

/** Zip a set of output files (used when a split produces more than one PDF). */
export async function zipFiles(files: OutputFile[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.bytes);
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
