'use client';

/**
 * Client-side PDF page thumbnails, shared by the Organize tool family
 * (split / remove pages / extract pages / organize-reorder).
 *
 * Rendering happens in the browser with pdfjs-dist, so the file never has to
 * be uploaded just to preview it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface PdfThumbnail {
  /** 1-based page number in the source document. */
  pageNumber: number;
  /** PNG data URL, or null while it is still rendering / if it failed. */
  dataUrl: string | null;
  width: number;
  height: number;
}

interface UsePdfThumbnailsResult {
  thumbnails: PdfThumbnail[];
  pageCount: number;
  loading: boolean;
  error: string | null;
}

const DEFAULT_THUMB_WIDTH = 190;
/** Rendering thousands of previews would lock the tab up; cap it. */
const MAX_THUMBNAILS = 300;

/**
 * Render every page of `file` to a small PNG data URL.
 * Falls back to placeholder entries (dataUrl === null) if pdfjs cannot render.
 */
export function usePdfThumbnails(
  file: File | null,
  options: { thumbWidth?: number; maxPages?: number } = {}
): UsePdfThumbnailsResult {
  const { thumbWidth = DEFAULT_THUMB_WIDTH, maxPages = MAX_THUMBNAILS } = options;

  const fileKey = file ? `${file.name}:${file.size}:${file.lastModified}` : '';

  const [state, setState] = useState<ThumbnailState>({
    key: '',
    thumbnails: [],
    pageCount: 0,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!file) return;

    let cancelled = false;

    const patch = (updater: (prev: ThumbnailState) => ThumbnailState) => {
      if (cancelled) return;
      setState((prev) => (cancelled ? prev : updater(prev.key === fileKey ? prev : emptyState(fileKey))));
    };

    const placeholders = (total: number): PdfThumbnail[] =>
      Array.from({ length: total }, (_, i) => ({
        pageNumber: i + 1,
        dataUrl: null,
        width: thumbWidth,
        height: Math.round(thumbWidth * 1.414),
      }));

    (async () => {
      const data = new Uint8Array(await file.arrayBuffer());

      // Page count first (pdf-lib is cheap and always available), so the grid
      // can show placeholders immediately even if pdfjs rendering is slow.
      let total = 0;
      try {
        const { PDFDocument } = await import('pdf-lib');
        const doc = await PDFDocument.load(data.slice(), { ignoreEncryption: true, updateMetadata: false });
        total = doc.getPageCount();
      } catch {
        total = 0;
      }

      if (cancelled) return;

      if (total > 0) {
        patch((prev) => ({ ...prev, pageCount: total, thumbnails: placeholders(total), loading: true }));
      }

      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const loadingTask = pdfjs.getDocument({ data });
        const doc = await loadingTask.promise;

        if (cancelled) {
          await loadingTask.destroy();
          return;
        }

        if (total === 0) {
          total = doc.numPages;
          patch((prev) => ({ ...prev, pageCount: total, thumbnails: placeholders(total), loading: true }));
        }

        const renderCount = Math.min(doc.numPages, maxPages);

        for (let pageNumber = 1; pageNumber <= renderCount; pageNumber++) {
          if (cancelled) break;

          const page = await doc.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const scale = thumbWidth / base.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          await page.render({ canvas, canvasContext: ctx, viewport }).promise;

          const dataUrl = canvas.toDataURL('image/png');
          const width = canvas.width;
          const height = canvas.height;
          page.cleanup();

          if (cancelled) break;

          patch((prev) => {
            const next = [...prev.thumbnails];
            const index = pageNumber - 1;
            if (!next[index]) return prev;
            next[index] = { pageNumber, dataUrl, width, height };
            return { ...prev, thumbnails: next };
          });
        }

        await loadingTask.destroy();
        patch((prev) => ({ ...prev, loading: false }));
      } catch {
        // Previews are a nicety — the tool still works with numbered placeholders.
        patch((prev) => ({
          ...prev,
          loading: false,
          error:
            prev.pageCount === 0
              ? 'Could not read this PDF. It may be corrupted or password protected.'
              : prev.error,
        }));
      }
    })().catch(() => {
      patch((prev) => ({
        ...prev,
        loading: false,
        error: 'Could not read this PDF. It may be corrupted or password protected.',
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [file, fileKey, thumbWidth, maxPages]);

  // State from a previously loaded file is ignored rather than cleared in an
  // effect, so a freshly picked file never flashes the old previews.
  const current = state.key === fileKey ? state : emptyState(fileKey, Boolean(file));

  return {
    thumbnails: current.thumbnails,
    pageCount: current.pageCount,
    loading: current.loading,
    error: current.error,
  };
}

interface ThumbnailState {
  key: string;
  thumbnails: PdfThumbnail[];
  pageCount: number;
  loading: boolean;
  error: string | null;
}

function emptyState(key: string, loading = false): ThumbnailState {
  return { key, thumbnails: [], pageCount: 0, loading, error: null };
}

/** Responsive grid wrapper used by every page-selection tool. */
export function ThumbnailGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
  );
}

export interface PageThumbnailProps {
  thumbnail: PdfThumbnail;
  /** Label under the tile. Defaults to the page number. */
  label?: string;
  /** Highlighted (e.g. kept page in "extract"). */
  selected?: boolean;
  /** Marked for deletion — draws a red overlay + X badge. */
  marked?: boolean;
  /** Extra rotation preview, in degrees. */
  rotation?: number;
  onClick?: () => void;
  /** Buttons rendered in the tile's action bar. */
  actions?: ReactNode;
  /** Drag & drop reordering hooks. */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  dragging?: boolean;
  className?: string;
}

export function PageThumbnail({
  thumbnail,
  label,
  selected,
  marked,
  rotation = 0,
  onClick,
  actions,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragging,
  className = '',
}: PageThumbnailProps) {
  const isLandscape = rotation === 90 || rotation === 270;

  return (
    <div
      data-page={thumbnail.pageNumber}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative rounded-2xl border-2 bg-white p-2 transition-all ${
        marked
          ? 'border-red-400 bg-red-50/60'
          : selected
            ? 'border-brand-red shadow-md shadow-red-500/10'
            : 'border-gray-200 hover:border-gray-300'
      } ${dragging ? 'opacity-40' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-pressed={selected || marked ? true : undefined}
        aria-label={`Page ${thumbnail.pageNumber}`}
        className={`relative block w-full overflow-hidden rounded-xl bg-gray-50 ${
          onClick ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{ aspectRatio: '3 / 4' }}
      >
        {thumbnail.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- client-generated data URL preview
          <img
            src={thumbnail.dataUrl}
            alt={`Page ${thumbnail.pageNumber}`}
            className="absolute inset-0 m-auto max-h-full max-w-full object-contain transition-transform duration-200"
            style={{
              transform: `rotate(${rotation}deg)${isLandscape ? ' scale(0.75)' : ''}`,
            }}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-400">
            Page {thumbnail.pageNumber}
          </span>
        )}

        {marked && (
          <span className="absolute inset-0 flex items-center justify-center bg-red-500/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </span>
        )}

        {selected && !marked && (
          <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-red text-white shadow">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </button>

      {draggable && (
        <span
          aria-hidden
          title="Drag to reorder"
          className="pointer-events-none absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 text-gray-500 shadow-sm ring-1 ring-gray-200"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />
          </svg>
        </span>
      )}

      <div className="mt-2 flex items-center justify-between gap-1 px-1">
        <span className="truncate text-xs font-semibold text-gray-600">
          {label ?? `Page ${thumbnail.pageNumber}`}
        </span>
        {actions && <span className="flex shrink-0 items-center gap-0.5">{actions}</span>}
      </div>
    </div>
  );
}

/** Small square icon button used inside a thumbnail's action bar. */
export function ThumbnailAction({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-lg border border-transparent p-1.5 text-gray-400 transition-colors hover:bg-gray-100 ${
        danger ? 'hover:text-red-600' : 'hover:text-brand-dark'
      } cursor-pointer`}
    >
      {children}
    </button>
  );
}

/** Shared helper: move an array item from one index to another (immutably). */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

/** Shared helper: read a File as a data URL (used for JSON API payloads). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

/** Trigger a browser download for a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Human readable byte size, matching the formatting used across the tools. */
export function formatSize(bytes: number): string {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const useCountdownDownload = () => {
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((seconds = 10) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let remaining = seconds;
    setCountdown(remaining);
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { countdown, start };
};
