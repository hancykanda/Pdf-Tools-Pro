'use client';

/**
 * Browser-side pdf.js helpers used by the "Edit" submodel tools to show the
 * real pages (canvas view for edit/crop/watermark, thumbnail grid for rotate,
 * live preview for page numbers).
 *
 * pdf.js is imported lazily so it never ends up in the server bundle.
 */

type PdfjsModule = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfjsModule> | null = null;

export async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      } catch {
        // Bundler could not resolve the worker as an asset: use the copy that
        // matches the installed version from the CDN.
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export interface RenderedPage {
  /** 1-based page number. */
  pageNumber: number;
  /** JPEG/PNG data URL of the rendered page. */
  dataUrl: string;
  /** Page size in PDF points as displayed (rotation applied). */
  width: number;
  height: number;
  /** Existing /Rotate value of the page. */
  rotation: number;
}

interface RenderOptions {
  /** 1-based page numbers to render. Defaults to every page. */
  pages?: number[];
  /** Target width in CSS pixels of the rendered bitmap. */
  targetWidth?: number;
  /** Called after each page so the UI can show progress. */
  onPage?: (page: RenderedPage) => void;
  /** Max device pixel ratio multiplier applied on top of `targetWidth`. */
  quality?: number;
}

function copyBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  // pdf.js transfers (detaches) the buffer it is given, so always hand it a copy.
  return data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data.slice(0));
}

export interface PdfInfo {
  numPages: number;
  pages: Array<{ pageNumber: number; width: number; height: number; rotation: number }>;
}

export async function getPdfInfo(data: ArrayBuffer | Uint8Array): Promise<PdfInfo> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: copyBytes(data) });
  const doc = await task.promise;

  try {
    const pages: PdfInfo['pages'] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      pages.push({
        pageNumber: i,
        width: viewport.width,
        height: viewport.height,
        rotation: page.rotate ?? 0,
      });
      page.cleanup();
    }
    return { numPages: doc.numPages, pages };
  } finally {
    await task.destroy();
  }
}

/**
 * Renders pages to data URLs. Yields through `onPage` as soon as each page is
 * ready so large documents progressively fill a thumbnail grid.
 */
export async function renderPdfPages(
  data: ArrayBuffer | Uint8Array,
  options: RenderOptions = {}
): Promise<RenderedPage[]> {
  const { pages, targetWidth = 800, onPage, quality = 1.5 } = options;

  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: copyBytes(data) });
  const doc = await task.promise;
  const results: RenderedPage[] = [];

  try {
    const pageNumbers = pages ?? Array.from({ length: doc.numPages }, (_, i) => i + 1);

    for (const pageNumber of pageNumbers) {
      if (pageNumber < 1 || pageNumber > doc.numPages) continue;

      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(
        Math.max((targetWidth / base.width) * quality, 0.1),
        6
      );
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext('2d');
      if (!context) {
        page.cleanup();
        continue;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const rendered: RenderedPage = {
        pageNumber,
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
        width: base.width,
        height: base.height,
        rotation: page.rotate ?? 0,
      };

      results.push(rendered);
      onPage?.(rendered);
      page.cleanup();
    }

    return results;
  } finally {
    await task.destroy();
  }
}

export async function renderFirstPage(
  data: ArrayBuffer | Uint8Array,
  targetWidth = 800
): Promise<RenderedPage | null> {
  const [page] = await renderPdfPages(data, { pages: [1], targetWidth });
  return page ?? null;
}
