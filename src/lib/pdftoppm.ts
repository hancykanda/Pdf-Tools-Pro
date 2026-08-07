import { writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { runCommand, makeTempDir, which } from './cli';

const PDFTOPPM = which('pdftoppm') || 'pdftoppm';

export type RasterFormat = 'png' | 'jpeg';

export interface RasterPage {
  /** 1-based page number of the source PDF. */
  page: number;
  data: Buffer;
}

export interface RasterResult {
  /** One buffer per rendered page, in page order. */
  images: Buffer[];
  /** Same images, annotated with their source page number. */
  pages: RasterPage[];
  /** The format actually produced. */
  format: RasterFormat;
  /** File extension matching `format` ("png" | "jpg"). */
  extension: 'png' | 'jpg';
}

export interface RasterOptions {
  /** Output resolution in DPI (default 150). */
  dpi?: number;
  /** Output image format (default "png"). */
  format?: RasterFormat;
  /** JPEG quality 1-100, ignored for PNG. */
  quality?: number;
  /** 1-based first page to render. */
  firstPage?: number;
  /** 1-based last page to render. */
  lastPage?: number;
  timeoutMs?: number;
}

/** Rasterize PDF pages to images via poppler's `pdftoppm`. */
export async function pdfToImages(
  inputPdf: Buffer,
  opts: RasterOptions = {},
): Promise<RasterResult> {
  const { dir, cleanup } = makeTempDir('pdftoppm-');
  try {
    const inPath = `${dir}/in.pdf`;
    writeFileSync(inPath, inputPdf);

    const format: RasterFormat = opts.format === 'jpeg' ? 'jpeg' : 'png';
    const ext = format === 'png' ? 'png' : 'jpg';
    const dpi = Math.min(Math.max(Math.round(opts.dpi || 150), 36), 600);

    // NOTE: poppler only accepts the long switches (`-png` / `-jpeg`);
    // abbreviations such as `-p` exit with code 99 and print the usage text.
    const args = ['-r', String(dpi), `-${format}`];
    if (format === 'jpeg' && opts.quality) {
      const q = Math.min(Math.max(Math.round(opts.quality), 1), 100);
      args.push('-jpegopt', `quality=${q}`);
    }
    if (opts.firstPage) args.push('-f', String(Math.max(1, Math.round(opts.firstPage))));
    if (opts.lastPage) args.push('-l', String(Math.max(1, Math.round(opts.lastPage))));
    args.push(inPath, `${dir}/page`);

    const res = await runCommand(PDFTOPPM, args, {
      timeoutMs: opts.timeoutMs || 180_000,
    });
    if (res.code !== 0) {
      throw new Error(`pdftoppm failed (exit ${res.code}): ${res.stderr.slice(0, 400)}`);
    }

    // pdftoppm zero-pads the page number based on the page count
    // (page-1.png, or page-01.png / page-001.png for longer documents).
    const files = readdirSync(dir)
      .map((name) => {
        const m = name.match(new RegExp(`^page-(\\d+)\\.${ext}$`));
        return m ? { name, page: Number(m[1]) } : null;
      })
      .filter((f): f is { name: string; page: number } => f !== null)
      .sort((a, b) => a.page - b.page);

    if (files.length === 0) throw new Error('pdftoppm produced no images');

    const pages: RasterPage[] = files.map((f) => ({
      page: f.page,
      data: readFileSync(`${dir}/${f.name}`),
    }));

    return {
      images: pages.map((p) => p.data),
      pages,
      format,
      extension: ext,
    };
  } finally {
    cleanup();
  }
}
