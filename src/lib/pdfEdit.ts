/**
 * Shared helpers for the "Edit" submodel tools (edit-pdf, rotate-pdf,
 * page-numbers, watermark, crop-pdf).
 *
 * All of these tools let the user position something on top of a page that they
 * are looking at in the browser (a pdf.js canvas). This module contains:
 *
 *  1. Request helpers — every route accepts `multipart/form-data` (preferred,
 *     no base64 bloat) or a legacy JSON body, and answers with the raw PDF
 *     bytes so the browser can download the file directly.
 *  2. Geometry helpers — a mapping between "view space" (what pdf.js renders:
 *     top-left origin, y grows downwards, already rotated by the page's
 *     /Rotate entry, measured in points at scale 1) and PDF user space
 *     (bottom-left origin, y grows upwards, unrotated).
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { Color } from 'pdf-lib';

/* ------------------------------------------------------------------ */
/* Requests / responses                                                */
/* ------------------------------------------------------------------ */

export class ToolRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ToolRequestError';
    this.status = status;
  }
}

export interface PdfUpload {
  /** Raw bytes of the uploaded PDF. */
  bytes: Uint8Array;
  /** Options sent either as the `options` JSON field or as the JSON body. */
  options: Record<string, unknown>;
  /** The parsed form when the request was multipart (holds extra assets). */
  form: FormData | null;
  /** Original file name, used to build the download name. */
  filename: string;
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new ToolRequestError('Invalid options payload');
  }
}

/**
 * Reads the uploaded PDF plus its options from either a multipart form
 * (`file` + `options`) or a JSON body (`{ file: "data:application/pdf;base64,..." }`).
 */
export async function readPdfUpload(request: Request): Promise<PdfUpload> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      throw new ToolRequestError('PDF file is required');
    }

    const options: Record<string, unknown> = {};
    const rawOptions = form.get('options');
    if (typeof rawOptions === 'string' && rawOptions.trim()) {
      Object.assign(options, parseJsonObject(rawOptions));
    }
    // Plain scalar fields are merged in as a convenience (curl/tests).
    for (const [key, value] of form.entries()) {
      if (key === 'file' || key === 'options') continue;
      if (typeof value === 'string' && !(key in options)) options[key] = value;
    }

    return {
      bytes: new Uint8Array(await file.arrayBuffer()),
      options,
      form,
      filename: file.name || 'document.pdf',
    };
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    throw new ToolRequestError('Invalid request body');
  }

  const file = body.file;
  if (typeof file !== 'string' || !file) {
    throw new ToolRequestError('PDF file is required');
  }

  const base64 = file.includes(',') ? file.slice(file.indexOf(',') + 1) : file;
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  } catch {
    throw new ToolRequestError('The uploaded file could not be decoded');
  }
  if (bytes.byteLength === 0) {
    throw new ToolRequestError('The uploaded file is empty');
  }

  const { file: _ignored, ...options } = body;
  void _ignored;

  return {
    bytes,
    options,
    form: null,
    filename: typeof body.filename === 'string' ? body.filename : 'document.pdf',
  };
}

/** Loads a PDF and turns pdf-lib's parser errors into a readable message. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new ToolRequestError('The file could not be read as a PDF. It may be corrupted.');
  }
  if (doc.getPageCount() === 0) {
    throw new ToolRequestError('The PDF has no pages');
  }
  return doc;
}

/** Binary PDF response — the browser turns this straight into a download. */
export function pdfResponse(bytes: Uint8Array, filename: string, extraHeaders?: Record<string, string>) {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^\w.\-]+/g, '_')}"`,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

/** Consistent JSON error payloads across the submodel. */
export function toolErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ToolRequestError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return Response.json({ error: fallback }, { status: 500 });
}

/** `document.pdf` + `-rotated` => `document-rotated.pdf` */
export function suffixFilename(filename: string, suffix: string): string {
  const base = filename.replace(/\.pdf$/i, '') || 'document';
  return `${base}-${suffix}.pdf`;
}

/* ------------------------------------------------------------------ */
/* Geometry: view space <-> user space                                 */
/* ------------------------------------------------------------------ */

export interface PageView {
  /** Visible box in user space (CropBox, falling back to MediaBox). */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Normalised page rotation: 0 | 90 | 180 | 270. */
  rotation: number;
  /** Size of the page as displayed (pdf.js viewport at scale 1). */
  width: number;
  height: number;
}

export function normalizeAngle(angle: number): number {
  const rounded = Math.round(angle / 90) * 90;
  return ((rounded % 360) + 360) % 360;
}

export function getPageView(page: PDFPage): PageView {
  const box = page.getCropBox();
  const x1 = box.x;
  const y1 = box.y;
  const x2 = box.x + box.width;
  const y2 = box.y + box.height;
  const rotation = normalizeAngle(page.getRotation().angle);
  const swapped = rotation === 90 || rotation === 270;

  return {
    x1,
    y1,
    x2,
    y2,
    rotation,
    width: swapped ? box.height : box.width,
    height: swapped ? box.width : box.height,
  };
}

/**
 * Maps a point from view space (top-left origin, y down) to PDF user space.
 * Derived from pdf.js' `PageViewport` transform for each rotation.
 */
export function viewToUser(view: PageView, vx: number, vy: number): { x: number; y: number } {
  switch (view.rotation) {
    case 90:
      return { x: view.x1 + vy, y: view.y1 + vx };
    case 180:
      return { x: view.x2 - vx, y: view.y1 + vy };
    case 270:
      return { x: view.x2 - vy, y: view.y2 - vx };
    default:
      return { x: view.x1 + vx, y: view.y2 - vy };
  }
}

export interface UprightBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
}

/**
 * Placement for a box (image / rectangle) whose top-left corner sits at
 * (x, y) in view space and which must appear upright to the reader.
 *
 * pdf-lib rotates drawings around their `(x, y)` origin, so the origin has to
 * be moved to the corner that ends up at the bottom-left after rotation.
 */
export function uprightBox(view: PageView, x: number, y: number, width: number, height: number): UprightBox {
  switch (view.rotation) {
    case 90:
      return { x: view.x1 + y + height, y: view.y1 + x, width, height, rotate: 90 };
    case 180:
      return { x: view.x2 - x, y: view.y1 + y + height, width, height, rotate: 180 };
    case 270:
      return { x: view.x2 - y - height, y: view.y2 - x, width, height, rotate: 270 };
    default:
      return { x: view.x1 + x, y: view.y2 - y - height, width, height, rotate: 0 };
  }
}

/**
 * Origin (bottom-left of the un-rotated box) for something of size
 * `width` x `height` that should be centred on the user-space point `center`
 * and rotated by `angle` degrees counter-clockwise.
 */
export function centeredPlacement(
  center: { x: number; y: number },
  width: number,
  height: number,
  angle: number
): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // right = (cos, sin), up = (-sin, cos)
  return {
    x: center.x - (width / 2) * cos + (height / 2) * sin,
    y: center.y - (width / 2) * sin - (height / 2) * cos,
  };
}

/* ------------------------------------------------------------------ */
/* Fonts / colors / text                                               */
/* ------------------------------------------------------------------ */

export type FontKey = 'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'TimesRomanBold' | 'Courier' | 'CourierBold';

const FONT_MAP: Record<FontKey, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  HelveticaBold: StandardFonts.HelveticaBold,
  TimesRoman: StandardFonts.TimesRoman,
  TimesRomanBold: StandardFonts.TimesRomanBold,
  Courier: StandardFonts.Courier,
  CourierBold: StandardFonts.CourierBold,
};

export function resolveFontKey(family: unknown, bold?: unknown): FontKey {
  const raw = String(family ?? 'Helvetica').toLowerCase();
  const isBold = bold === true || bold === 'true';
  if (raw.includes('times') || raw.includes('serif')) return isBold ? 'TimesRomanBold' : 'TimesRoman';
  if (raw.includes('courier') || raw.includes('mono')) return isBold ? 'CourierBold' : 'Courier';
  if (raw.includes('bold')) return 'HelveticaBold';
  return isBold ? 'HelveticaBold' : 'Helvetica';
}

/** Caches embedded standard fonts per document. */
export function createFontLoader(doc: PDFDocument) {
  const cache = new Map<FontKey, PDFFont>();
  return async (key: FontKey): Promise<PDFFont> => {
    const existing = cache.get(key);
    if (existing) return existing;
    const font = await doc.embedFont(FONT_MAP[key]);
    cache.set(key, font);
    return font;
  };
}

const TYPOGRAPHIC_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  [/[\u201C\u201D\u201E\u201F]/g, '"'],
  [/[\u2013\u2014\u2015]/g, '-'],
  [/[\u2026]/g, '...'],
  [/[\u00A0\u2007\u202F]/g, ' '],
  [/[\u2022]/g, '-'],
];

/**
 * The 14 standard fonts only cover WinAnsi. Strip anything else instead of
 * letting pdf-lib throw halfway through the document.
 */
export function sanitizeWinAnsi(text: string): string {
  let out = String(text ?? '');
  for (const [pattern, replacement] of TYPOGRAPHIC_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  // Keep printable ASCII, Latin-1 supplement, newlines and tabs.
  return out.replace(/[^\n\t\x20-\x7E\u00A1-\u00FF]/g, '');
}

export function parseColor(value: unknown, fallback: Color = rgb(0, 0, 0)): Color {
  if (typeof value !== 'string') return fallback;
  const hex = value.trim().replace(/^#/, '');
  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return fallback;
  const int = parseInt(expanded, 16);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function toNumber(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/* ------------------------------------------------------------------ */
/* Positioning presets shared by page numbers / watermark              */
/* ------------------------------------------------------------------ */

export type PositionPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export const POSITION_PRESETS: PositionPreset[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export function normalizePosition(value: unknown, fallback: PositionPreset = 'bottom-center'): PositionPreset {
  const raw = String(value ?? '').toLowerCase().trim();
  if ((POSITION_PRESETS as string[]).includes(raw)) return raw as PositionPreset;
  // Legacy aliases used by the previous UI.
  if (raw === 'middle' || raw === 'centre') return 'center';
  if (raw === 'top') return 'top-center';
  if (raw === 'bottom') return 'bottom-center';
  return fallback;
}

/**
 * Centre point (view space) of a `width` x `height` block placed at a preset
 * with the given margin.
 */
export function presetCenter(
  position: PositionPreset,
  viewWidth: number,
  viewHeight: number,
  width: number,
  height: number,
  margin: number
): { x: number; y: number } {
  const [vertical, horizontal] = position.split('-') as [string, string];

  let x = viewWidth / 2;
  if (horizontal === 'left') x = margin + width / 2;
  else if (horizontal === 'right') x = viewWidth - margin - width / 2;

  let y = viewHeight / 2;
  if (vertical === 'top') y = margin + height / 2;
  else if (vertical === 'bottom') y = viewHeight - margin - height / 2;

  return { x, y };
}

/** Convenience re-export so routes don't each import `degrees`. */
export const deg = degrees;
