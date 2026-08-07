/**
 * Minimal PDF content-stream tooling used by the redaction pipeline.
 *
 * It contains three pieces:
 *  - a byte-accurate lexer for content streams (keeps source offsets so the
 *    caller can splice the original bytes instead of re-serialising them),
 *  - 2D matrix helpers for the CTM / text matrix bookkeeping,
 *  - a font-metrics reader that resolves glyph widths from the page resources
 *    (embedded /Widths, CID /W arrays, or the standard-14 AFM metrics).
 *
 * Everything here is defensive: a malformed stream should degrade to "no
 * edits" rather than throwing.
 */

import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRef, PDFStream } from 'pdf-lib';
import { Encodings, Font, FontNames, type IFontNames } from '@pdf-lib/standard-fonts';

/* -------------------------------------------------------------------------- */
/* Matrices                                                                    */
/* -------------------------------------------------------------------------- */

/** [a, b, c, d, e, f] — the usual PDF 3x2 affine matrix. */
export type Matrix = [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Returns `m1 x m2` (apply m1 first, then m2). */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2,
  ];
}

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Axis-aligned bounding box of the rectangle (x0,y0)-(x1,y1) after `m`. */
export function transformBox(m: Matrix, x0: number, y0: number, x1: number, y1: number): Box {
  const pts: Array<[number, number]> = [
    applyMatrix(m, x0, y0),
    applyMatrix(m, x1, y0),
    applyMatrix(m, x0, y1),
    applyMatrix(m, x1, y1),
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function intersectionArea(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

export function boxArea(b: Box): number {
  return Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
}

/* -------------------------------------------------------------------------- */
/* Lexer                                                                       */
/* -------------------------------------------------------------------------- */

export type TokenType =
  | 'number'
  | 'name'
  | 'string'
  | 'arrayOpen'
  | 'arrayClose'
  | 'dictOpen'
  | 'dictClose'
  | 'operator'
  | 'inlineImage';

export interface Token {
  type: TokenType;
  /** Byte offset of the first character of the token. */
  start: number;
  /** Byte offset just past the last character of the token. */
  end: number;
  number?: number;
  name?: string;
  /** Decoded bytes for literal/hex strings. */
  bytes?: Uint8Array;
  operator?: string;
}

const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIMITERS = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);

function isWhite(b: number): boolean {
  return WHITESPACE.has(b);
}

function isDelim(b: number): boolean {
  return DELIMITERS.has(b);
}

function isRegular(b: number): boolean {
  return !isWhite(b) && !isDelim(b);
}

function hexVal(b: number): number {
  if (b >= 0x30 && b <= 0x39) return b - 0x30;
  if (b >= 0x41 && b <= 0x46) return b - 0x41 + 10;
  if (b >= 0x61 && b <= 0x66) return b - 0x61 + 10;
  return -1;
}

/**
 * Tokenises a content stream. Inline images (`BI ... ID <binary> EI`) are
 * emitted as a single opaque token so their binary payload never confuses the
 * lexer.
 */
export function tokenizeContentStream(data: Uint8Array): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = data.length;

  while (i < n) {
    const b = data[i];

    // Whitespace
    if (isWhite(b)) {
      i++;
      continue;
    }

    // Comment
    if (b === 0x25) {
      while (i < n && data[i] !== 0x0a && data[i] !== 0x0d) i++;
      continue;
    }

    const start = i;

    // Array delimiters
    if (b === 0x5b) {
      tokens.push({ type: 'arrayOpen', start, end: ++i });
      continue;
    }
    if (b === 0x5d) {
      tokens.push({ type: 'arrayClose', start, end: ++i });
      continue;
    }

    // Dict / hex string
    if (b === 0x3c) {
      if (i + 1 < n && data[i + 1] === 0x3c) {
        i += 2;
        tokens.push({ type: 'dictOpen', start, end: i });
        continue;
      }
      // hex string
      i++;
      const out: number[] = [];
      let hi = -1;
      while (i < n && data[i] !== 0x3e) {
        const v = hexVal(data[i]);
        if (v >= 0) {
          if (hi < 0) hi = v;
          else {
            out.push(hi * 16 + v);
            hi = -1;
          }
        }
        i++;
      }
      if (hi >= 0) out.push(hi * 16);
      if (i < n) i++; // consume '>'
      tokens.push({ type: 'string', start, end: i, bytes: Uint8Array.from(out) });
      continue;
    }
    if (b === 0x3e) {
      if (i + 1 < n && data[i + 1] === 0x3e) {
        i += 2;
        tokens.push({ type: 'dictClose', start, end: i });
        continue;
      }
      i++; // stray '>' — skip
      continue;
    }

    // Literal string
    if (b === 0x28) {
      i++;
      let depth = 1;
      const out: number[] = [];
      while (i < n) {
        const c = data[i];
        if (c === 0x5c) {
          // escape
          i++;
          if (i >= n) break;
          const e = data[i];
          switch (e) {
            case 0x6e: out.push(0x0a); i++; break; // n
            case 0x72: out.push(0x0d); i++; break; // r
            case 0x74: out.push(0x09); i++; break; // t
            case 0x62: out.push(0x08); i++; break; // b
            case 0x66: out.push(0x0c); i++; break; // f
            case 0x28: out.push(0x28); i++; break;
            case 0x29: out.push(0x29); i++; break;
            case 0x5c: out.push(0x5c); i++; break;
            case 0x0d:
              i++;
              if (i < n && data[i] === 0x0a) i++;
              break; // line continuation
            case 0x0a: i++; break;
            default: {
              if (e >= 0x30 && e <= 0x37) {
                let code = 0;
                let digits = 0;
                while (i < n && digits < 3 && data[i] >= 0x30 && data[i] <= 0x37) {
                  code = code * 8 + (data[i] - 0x30);
                  i++;
                  digits++;
                }
                out.push(code & 0xff);
              } else {
                out.push(e);
                i++;
              }
            }
          }
          continue;
        }
        if (c === 0x28) depth++;
        if (c === 0x29) {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        out.push(c);
        i++;
      }
      tokens.push({ type: 'string', start, end: i, bytes: Uint8Array.from(out) });
      continue;
    }

    // Name
    if (b === 0x2f) {
      i++;
      let name = '';
      while (i < n && isRegular(data[i])) {
        if (data[i] === 0x23 && i + 2 < n && hexVal(data[i + 1]) >= 0 && hexVal(data[i + 2]) >= 0) {
          name += String.fromCharCode(hexVal(data[i + 1]) * 16 + hexVal(data[i + 2]));
          i += 3;
        } else {
          name += String.fromCharCode(data[i]);
          i++;
        }
      }
      tokens.push({ type: 'name', start, end: i, name });
      continue;
    }

    // Number
    if ((b >= 0x30 && b <= 0x39) || b === 0x2b || b === 0x2d || b === 0x2e) {
      let raw = '';
      while (i < n && isRegular(data[i])) {
        raw += String.fromCharCode(data[i]);
        i++;
      }
      const value = parseFloat(raw.replace(/(?!^)[+-]/g, ''));
      tokens.push({ type: 'number', start, end: i, number: Number.isFinite(value) ? value : 0 });
      continue;
    }

    // Curly braces (PostScript calculator functions) — treat as operators
    if (b === 0x7b || b === 0x7d) {
      i++;
      tokens.push({ type: 'operator', start, end: i, operator: String.fromCharCode(b) });
      continue;
    }

    // Operator (keyword)
    {
      let op = '';
      while (i < n && isRegular(data[i])) {
        op += String.fromCharCode(data[i]);
        i++;
      }
      if (op.length === 0) {
        i++; // unknown byte, skip
        continue;
      }
      if (op === 'BI') {
        // Inline image: skip to the matching EI.
        const imgEnd = findInlineImageEnd(data, i);
        tokens.push({ type: 'inlineImage', start, end: imgEnd, operator: 'BI' });
        i = imgEnd;
        continue;
      }
      tokens.push({ type: 'operator', start, end: i, operator: op });
      continue;
    }
  }

  return tokens;
}

/** Finds the byte offset just past the `EI` that closes an inline image. */
function findInlineImageEnd(data: Uint8Array, from: number): number {
  const n = data.length;
  let i = from;
  // Find the ID operator that begins the binary payload.
  while (i < n - 1) {
    if (data[i] === 0x49 /* I */ && data[i + 1] === 0x44 /* D */) {
      const prev = i > 0 ? data[i - 1] : 0x20;
      const next = i + 2 < n ? data[i + 2] : 0x20;
      if (!isRegular(prev) && (isWhite(next) || isDelim(next))) {
        i += 3; // ID + single whitespace
        break;
      }
    }
    i++;
  }
  // Scan for whitespace-delimited EI.
  while (i < n - 1) {
    if (
      data[i] === 0x45 /* E */ &&
      data[i + 1] === 0x49 /* I */ &&
      (i === 0 || isWhite(data[i - 1])) &&
      (i + 2 >= n || isWhite(data[i + 2]) || isDelim(data[i + 2]))
    ) {
      return i + 2;
    }
    i++;
  }
  return n;
}

/* -------------------------------------------------------------------------- */
/* Operand values                                                              */
/* -------------------------------------------------------------------------- */

export type Operand =
  | { kind: 'number'; value: number }
  | { kind: 'name'; value: string }
  | { kind: 'string'; bytes: Uint8Array }
  | { kind: 'array'; items: Operand[] }
  | { kind: 'dict' }
  | { kind: 'other' };

/* -------------------------------------------------------------------------- */
/* Font metrics                                                                */
/* -------------------------------------------------------------------------- */

export interface FontMetrics {
  /** Codes are 2 bytes wide (Type0 / Identity-H style fonts). */
  twoByte: boolean;
  /** Glyph advance for `code`, in 1/1000 text-space units. */
  widthOf(code: number): number;
  /** Ascent in 1/1000 text-space units. */
  ascent: number;
  /** Descent (negative) in 1/1000 text-space units. */
  descent: number;
}

const DEFAULT_WIDTH = 500;

export const FALLBACK_FONT_METRICS: FontMetrics = {
  twoByte: false,
  widthOf: () => DEFAULT_WIDTH,
  ascent: 750,
  descent: -250,
};

const standardFontCache = new Map<string, Map<number, number> | null>();

const STANDARD_FONT_ALIASES: Record<string, IFontNames> = {
  courier: FontNames.Courier,
  couriernew: FontNames.Courier,
  courierbold: FontNames.CourierBold,
  couriernewbold: FontNames.CourierBold,
  courieroblique: FontNames.CourierOblique,
  courieritalic: FontNames.CourierOblique,
  courierboldoblique: FontNames.CourierBoldOblique,
  courierbolditalic: FontNames.CourierBoldOblique,
  helvetica: FontNames.Helvetica,
  arial: FontNames.Helvetica,
  arialmt: FontNames.Helvetica,
  helveticabold: FontNames.HelveticaBold,
  arialbold: FontNames.HelveticaBold,
  arialboldmt: FontNames.HelveticaBold,
  helveticaoblique: FontNames.HelveticaOblique,
  helveticaitalic: FontNames.HelveticaOblique,
  arialitalic: FontNames.HelveticaOblique,
  helveticaboldoblique: FontNames.HelveticaBoldOblique,
  arialbolditalic: FontNames.HelveticaBoldOblique,
  times: FontNames.TimesRoman,
  timesroman: FontNames.TimesRoman,
  timesnewroman: FontNames.TimesRoman,
  timesnewromanpsmt: FontNames.TimesRoman,
  timesbold: FontNames.TimesRomanBold,
  timesnewromanbold: FontNames.TimesRomanBold,
  timesitalic: FontNames.TimesRomanItalic,
  timesnewromanitalic: FontNames.TimesRomanItalic,
  timesbolditalic: FontNames.TimesRomanBoldItalic,
  timesnewromanbolditalic: FontNames.TimesRomanBoldItalic,
  symbol: FontNames.Symbol,
  zapfdingbats: FontNames.ZapfDingbats,
};

/** code -> glyph name table for the requested built-in encoding. */
function codeToGlyphName(encoding: 'WinAnsi' | 'Symbol' | 'ZapfDingbats'): Map<number, string> {
  const table = new Map<number, string>();
  const enc = Encodings[encoding];
  for (const cp of enc.supportedCodePoints) {
    try {
      const { code, name } = enc.encodeUnicodeCodePoint(cp);
      if (!table.has(code)) table.set(code, name);
    } catch {
      /* ignore */
    }
  }
  return table;
}

/** Builds (and caches) a code -> width table for a standard-14 font. */
function standardFontWidths(baseFont: string): Map<number, number> | null {
  const key = baseFont.replace(/^[A-Z]{6}\+/, '').replace(/[^A-Za-z]/g, '').toLowerCase();
  if (standardFontCache.has(key)) return standardFontCache.get(key) ?? null;

  const fontName = STANDARD_FONT_ALIASES[key];
  if (!fontName) {
    standardFontCache.set(key, null);
    return null;
  }

  try {
    const font = Font.load(fontName);
    const encoding =
      fontName === FontNames.Symbol
        ? 'Symbol'
        : fontName === FontNames.ZapfDingbats
          ? 'ZapfDingbats'
          : 'WinAnsi';
    const glyphNames = codeToGlyphName(encoding);
    const widths = new Map<number, number>();
    for (const [code, glyph] of glyphNames) {
      const w = font.getWidthOfGlyph(glyph);
      if (typeof w === 'number') widths.set(code, w);
    }
    standardFontCache.set(key, widths);
    return widths;
  } catch {
    standardFontCache.set(key, null);
    return null;
  }
}

function lookupDict(dict: PDFDict | undefined, key: string): PDFDict | undefined {
  if (!dict) return undefined;
  try {
    return dict.lookupMaybe(PDFName.of(key), PDFDict);
  } catch {
    return undefined;
  }
}

function lookupArray(dict: PDFDict | undefined, key: string): PDFArray | undefined {
  if (!dict) return undefined;
  try {
    return dict.lookupMaybe(PDFName.of(key), PDFArray);
  } catch {
    return undefined;
  }
}

function lookupNumber(dict: PDFDict | undefined, key: string): number | undefined {
  if (!dict) return undefined;
  try {
    const value = dict.lookupMaybe(PDFName.of(key), PDFNumber);
    return value ? value.asNumber() : undefined;
  } catch {
    return undefined;
  }
}

function lookupName(dict: PDFDict | undefined, key: string): string | undefined {
  if (!dict) return undefined;
  try {
    const value = dict.lookupMaybe(PDFName.of(key), PDFName);
    return value ? value.asString().replace(/^\//, '') : undefined;
  } catch {
    return undefined;
  }
}

function numbersFromArray(arr: PDFArray | undefined): number[] {
  if (!arr) return [];
  const out: number[] = [];
  for (let i = 0; i < arr.size(); i++) {
    try {
      const v = arr.lookup(i, PDFNumber);
      out.push(v.asNumber());
    } catch {
      out.push(NaN);
    }
  }
  return out;
}

/** Parses the CID /W array into a code -> width map. */
function parseCidWidths(w: PDFArray | undefined): Map<number, number> {
  const widths = new Map<number, number>();
  if (!w) return widths;

  let i = 0;
  while (i < w.size()) {
    let first: number;
    try {
      first = w.lookup(i, PDFNumber).asNumber();
    } catch {
      break;
    }
    const next = w.lookup(i + 1);
    if (next instanceof PDFArray) {
      const list = numbersFromArray(next);
      list.forEach((width, idx) => {
        if (Number.isFinite(width)) widths.set(first + idx, width);
      });
      i += 2;
    } else if (next instanceof PDFNumber) {
      const last = next.asNumber();
      let width = 0;
      try {
        width = w.lookup(i + 2, PDFNumber).asNumber();
      } catch {
        width = DEFAULT_WIDTH;
      }
      const span = Math.min(last - first, 65535);
      for (let c = 0; c <= span; c++) widths.set(first + c, width);
      i += 3;
    } else {
      break;
    }
  }
  return widths;
}

/**
 * Reads the metrics needed to lay out (and therefore locate) glyphs for the
 * font dictionary `fontDict`. Always returns something usable.
 */
export function readFontMetrics(fontDict: PDFDict | undefined): FontMetrics {
  if (!fontDict) return FALLBACK_FONT_METRICS;

  try {
    const subtype = lookupName(fontDict, 'Subtype') ?? '';
    const baseFont = lookupName(fontDict, 'BaseFont') ?? '';

    if (subtype === 'Type0') {
      const descendants = lookupArray(fontDict, 'DescendantFonts');
      let descendant: PDFDict | undefined;
      if (descendants && descendants.size() > 0) {
        const entry = descendants.lookup(0);
        if (entry instanceof PDFDict) descendant = entry;
      }
      const dw = lookupNumber(descendant, 'DW') ?? 1000;
      const widths = parseCidWidths(lookupArray(descendant, 'W'));
      const descriptor = lookupDict(descendant, 'FontDescriptor');
      return {
        twoByte: true,
        widthOf: (code) => widths.get(code) ?? dw,
        ascent: lookupNumber(descriptor, 'Ascent') ?? 880,
        descent: lookupNumber(descriptor, 'Descent') ?? -220,
      };
    }

    const descriptor = lookupDict(fontDict, 'FontDescriptor');
    const missingWidth = lookupNumber(descriptor, 'MissingWidth');
    const firstChar = lookupNumber(fontDict, 'FirstChar') ?? 0;
    const widthList = numbersFromArray(lookupArray(fontDict, 'Widths'));

    // Type3 widths live in glyph space and must be scaled by the font matrix.
    let scale = 1;
    if (subtype === 'Type3') {
      const fm = numbersFromArray(lookupArray(fontDict, 'FontMatrix'));
      const a = Number.isFinite(fm[0]) ? fm[0] : 0.001;
      scale = a * 1000;
    }

    const standard = widthList.length === 0 ? standardFontWidths(baseFont) : null;

    const ascent = lookupNumber(descriptor, 'Ascent') ?? 750;
    const descent = lookupNumber(descriptor, 'Descent') ?? -250;

    return {
      twoByte: false,
      widthOf: (code) => {
        if (widthList.length > 0) {
          const w = widthList[code - firstChar];
          if (Number.isFinite(w)) return w * scale;
          return missingWidth ?? DEFAULT_WIDTH;
        }
        if (standard) {
          const w = standard.get(code);
          if (typeof w === 'number') return w;
        }
        return missingWidth ?? DEFAULT_WIDTH;
      },
      ascent,
      descent,
    };
  } catch {
    return FALLBACK_FONT_METRICS;
  }
}

/** Resolves `/Resources /<category> /<name>` to a dictionary or stream. */
export function lookupResource(
  resources: PDFDict | undefined,
  category: string,
  name: string,
): { object: PDFDict | PDFStream | undefined; ref: PDFRef | undefined } {
  if (!resources) return { object: undefined, ref: undefined };
  try {
    const bucket = resources.lookupMaybe(PDFName.of(category), PDFDict);
    if (!bucket) return { object: undefined, ref: undefined };
    const raw = bucket.get(PDFName.of(name));
    const ref = raw instanceof PDFRef ? raw : undefined;
    const resolved = bucket.lookup(PDFName.of(name));
    if (resolved instanceof PDFDict || resolved instanceof PDFStream) {
      return { object: resolved, ref };
    }
    return { object: undefined, ref };
  } catch {
    return { object: undefined, ref: undefined };
  }
}
