/**
 * True PDF redaction.
 *
 * Unlike a "draw a black rectangle on top" approach, this module rewrites the
 * page content streams and physically deletes every glyph whose rendered
 * bounding box falls inside a redaction rectangle. The removed glyphs are
 * replaced by an equivalent TJ displacement so the surviving text on the same
 * line keeps its original position.
 *
 * What is stripped inside a redaction rectangle:
 *  - text runs / individual glyphs (Tj, TJ, ', "), including invisible OCR
 *    text (render mode 3) that sits under a scanned image,
 *  - image XObjects that are (almost) fully covered by the rectangle,
 *  - annotations (links, widgets, notes, ...) that overlap the rectangle,
 *  - text inside Form XObjects (the form is copied before being edited so
 *    other pages that share it are untouched).
 *
 * Known limitations are documented in the module README section of the tool
 * report: shading/pattern content and inline images are covered visually by
 * the black box but not removed, and text drawn through an uncommon CMap
 * (non Identity CID encodings) is located with approximate metrics.
 */

import {
  PDFArray,
  PDFContext,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFPage,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
  rgb,
} from 'pdf-lib';

import {
  FALLBACK_FONT_METRICS,
  IDENTITY,
  type Box,
  type FontMetrics,
  type Matrix,
  type Operand,
  type Token,
  boxArea,
  intersectionArea,
  lookupResource,
  multiply,
  readFontMetrics,
  tokenizeContentStream,
  transformBox,
} from './pdfContentStream';

export interface RedactRect {
  /** 0-based page index. */
  pageIndex: number;
  /** Lower-left corner, PDF user-space points. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RedactStats {
  pagesProcessed: number;
  regionsApplied: number;
  glyphsRemoved: number;
  textOpsModified: number;
  imagesRemoved: number;
  annotationsRemoved: number;
  contentStreamsRewritten: number;
}

/**
 * A glyph counts as redacted when the box covers at least this share of its
 * width *and* of its height (or when its centre is inside the box). Using both
 * axes avoids clipping the descenders of the line above a tightly drawn box,
 * while still removing every glyph the user visibly covered.
 */
const GLYPH_AXIS_THRESHOLD = 0.25;
/** Images are only dropped when essentially fully covered. */
const IMAGE_COVERAGE_THRESHOLD = 0.92;
const MAX_FORM_DEPTH = 8;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function rectToBox(r: RedactRect): Box {
  return {
    x0: Math.min(r.x, r.x + r.width),
    y0: Math.min(r.y, r.y + r.height),
    x1: Math.max(r.x, r.x + r.width),
    y1: Math.max(r.y, r.y + r.height),
  };
}

/** True when `glyph` is covered enough by any redaction box to be deleted. */
function isRedacted(glyph: Box, boxes: Box[]): boolean {
  const width = glyph.x1 - glyph.x0;
  const height = glyph.y1 - glyph.y0;
  const cx = (glyph.x0 + glyph.x1) / 2;
  const cy = (glyph.y0 + glyph.y1) / 2;

  for (const box of boxes) {
    if (cx >= box.x0 && cx <= box.x1 && cy >= box.y0 && cy <= box.y1) return true;

    const overlapW = Math.min(glyph.x1, box.x1) - Math.max(glyph.x0, box.x0);
    const overlapH = Math.min(glyph.y1, box.y1) - Math.max(glyph.y0, box.y0);
    if (overlapW <= 0 || overlapH <= 0) continue;

    // Degenerate glyph box (zero width/height) that still touches the box.
    if (width <= 0 || height <= 0) return true;

    if (overlapW / width >= GLYPH_AXIS_THRESHOLD && overlapH / height >= GLYPH_AXIS_THRESHOLD) {
      return true;
    }
  }
  return false;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function bytesToHex(bytes: number[]): string {
  let out = '';
  for (const b of bytes) out += (b & 0xff).toString(16).padStart(2, '0');
  return out;
}

function decodeStream(stream: PDFStream): Uint8Array {
  if (stream instanceof PDFRawStream) {
    try {
      return decodePDFRawStream(stream).decode();
    } catch {
      return stream.getContents();
    }
  }
  try {
    return stream.getContents();
  } catch {
    return new Uint8Array();
  }
}

function encodeAscii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/* -------------------------------------------------------------------------- */
/* Content stream rewriting                                                    */
/* -------------------------------------------------------------------------- */

type ShowItem =
  | { kind: 'glyphs'; codes: number[]; raw: number[][] }
  | { kind: 'adjust'; value: number };

interface GraphicsState {
  ctm: Matrix;
  font: FontMetrics;
  fontSize: number;
  charSpacing: number;
  wordSpacing: number;
  hScale: number;
  leading: number;
  rise: number;
}

interface Edit {
  start: number;
  end: number;
  replacement: Uint8Array;
}

interface ProcessResult {
  bytes: Uint8Array;
  changed: boolean;
  glyphsRemoved: number;
  textOpsModified: number;
  imagesRemoved: number;
  /** XObject entries the caller must re-point at a private (edited) copy. */
  xobjReplacements: Array<{ name: string; ref: PDFRef }>;
}

interface ProcessOptions {
  data: Uint8Array;
  resources: PDFDict | undefined;
  baseCtm: Matrix;
  boxes: Box[];
  context: PDFContext;
  depth: number;
  visited: Set<string>;
}

function initialState(ctm: Matrix): GraphicsState {
  return {
    ctm,
    font: FALLBACK_FONT_METRICS,
    fontSize: 0,
    charSpacing: 0,
    wordSpacing: 0,
    hScale: 1,
    leading: 0,
    rise: 0,
  };
}

function cloneState(s: GraphicsState): GraphicsState {
  return { ...s, ctm: [...s.ctm] as Matrix };
}

/** Splits a PDF string into character codes according to the font's byte width. */
function splitCodes(bytes: Uint8Array, twoByte: boolean): { codes: number[]; raw: number[][] } {
  const codes: number[] = [];
  const raw: number[][] = [];
  if (twoByte) {
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      codes.push((bytes[i] << 8) | bytes[i + 1]);
      raw.push([bytes[i], bytes[i + 1]]);
    }
    if (bytes.length % 2 === 1) {
      codes.push(bytes[bytes.length - 1]);
      raw.push([bytes[bytes.length - 1]]);
    }
  } else {
    for (let i = 0; i < bytes.length; i++) {
      codes.push(bytes[i]);
      raw.push([bytes[i]]);
    }
  }
  return { codes, raw };
}

export function processContentStream(opts: ProcessOptions): ProcessResult {
  const { data, resources, baseCtm, boxes, context, depth, visited } = opts;

  const result: ProcessResult = {
    bytes: data,
    changed: false,
    glyphsRemoved: 0,
    textOpsModified: 0,
    imagesRemoved: 0,
    xobjReplacements: [],
  };

  let tokens: Token[];
  try {
    tokens = tokenizeContentStream(data);
  } catch {
    return result;
  }

  const edits: Edit[] = [];
  const stack: GraphicsState[] = [];
  let gs = initialState(baseCtm);
  let tm: Matrix = [...IDENTITY] as Matrix;
  let tlm: Matrix = [...IDENTITY] as Matrix;

  // Operand accumulation
  let operands: Operand[] = [];
  let operandStart = -1;
  const arrayStack: Operand[][] = [];
  let dictDepth = 0;

  const pushOperand = (value: Operand, start: number) => {
    if (arrayStack.length > 0) {
      arrayStack[arrayStack.length - 1].push(value);
      return;
    }
    if (operands.length === 0) operandStart = start;
    operands.push(value);
  };

  const numAt = (index: number): number => {
    const op = operands[index];
    return op && op.kind === 'number' ? op.value : 0;
  };

  /**
   * Lays out `items` starting at the current text matrix, deciding which
   * glyphs fall inside a redaction box. Returns the rebuilt TJ items plus the
   * updated text matrix.
   */
  const layoutAndFilter = (
    items: ShowItem[],
  ): { out: ShowItem[]; removed: number; anyRemoved: boolean } => {
    const out: ShowItem[] = [];
    let removed = 0;
    let pendingAdvance = 0;

    const flushPending = () => {
      if (pendingAdvance === 0) return;
      const denom = gs.fontSize * gs.hScale;
      const adjust = denom === 0 ? 0 : (-pendingAdvance * 1000) / denom;
      if (adjust !== 0) out.push({ kind: 'adjust', value: adjust });
      pendingAdvance = 0;
    };

    for (const item of items) {
      if (item.kind === 'adjust') {
        const tx = ((-item.value / 1000) * gs.fontSize) * gs.hScale;
        tm = multiply([1, 0, 0, 1, tx, 0], tm);
        flushPending();
        out.push(item);
        continue;
      }

      let keepRun: number[][] = [];

      const flushKeep = () => {
        if (keepRun.length === 0) return;
        const codes: number[] = [];
        const raws: number[][] = [];
        for (const r of keepRun) {
          raws.push(r);
          codes.push(r.length === 2 ? (r[0] << 8) | r[1] : r[0]);
        }
        out.push({ kind: 'glyphs', codes, raw: raws });
        keepRun = [];
      };

      for (let i = 0; i < item.codes.length; i++) {
        const code = item.codes[i];
        const rawBytes = item.raw[i];
        const w0 = gs.font.widthOf(code) / 1000;

        const trm = multiply(
          [gs.fontSize * gs.hScale, 0, 0, gs.fontSize, 0, gs.rise],
          multiply(tm, gs.ctm),
        );
        const glyphBox = transformBox(trm, 0, gs.font.descent / 1000, w0, gs.font.ascent / 1000);

        const hit = isRedacted(glyphBox, boxes);

        const isWordSpace = !gs.font.twoByte && rawBytes.length === 1 && rawBytes[0] === 32;
        const tx =
          (w0 * gs.fontSize + gs.charSpacing + (isWordSpace ? gs.wordSpacing : 0)) * gs.hScale;

        if (hit) {
          flushKeep();
          pendingAdvance += tx;
          removed += 1;
        } else {
          flushPending();
          keepRun.push(rawBytes);
        }

        tm = multiply([1, 0, 0, 1, tx, 0], tm);
      }

      flushKeep();
    }

    flushPending();
    return { out, removed, anyRemoved: removed > 0 };
  };

  const serializeShow = (items: ShowItem[], prefix = ''): Uint8Array => {
    let body = '';
    for (const item of items) {
      if (item.kind === 'adjust') {
        body += `${formatNumber(item.value)} `;
      } else {
        const flat: number[] = [];
        for (const r of item.raw) flat.push(...r);
        if (flat.length === 0) continue;
        body += `<${bytesToHex(flat)}> `;
      }
    }
    return encodeAscii(`${prefix}[${body.trimEnd()}] TJ`);
  };

  const handleShow = (items: ShowItem[], start: number, end: number, prefix = '') => {
    const { out, anyRemoved, removed } = layoutAndFilter(items);
    if (!anyRemoved) return;
    edits.push({ start, end, replacement: serializeShow(out, prefix) });
    result.glyphsRemoved += removed;
    result.textOpsModified += 1;
  };

  const stringOperandToItems = (op: Operand | undefined): ShowItem[] => {
    if (!op || op.kind !== 'string') return [];
    const { codes, raw } = splitCodes(op.bytes, gs.font.twoByte);
    return [{ kind: 'glyphs', codes, raw }];
  };

  for (const token of tokens) {
    switch (token.type) {
      case 'number':
        pushOperand({ kind: 'number', value: token.number ?? 0 }, token.start);
        continue;
      case 'name':
        pushOperand({ kind: 'name', value: token.name ?? '' }, token.start);
        continue;
      case 'string':
        pushOperand({ kind: 'string', bytes: token.bytes ?? new Uint8Array() }, token.start);
        continue;
      case 'arrayOpen':
        if (arrayStack.length === 0 && operands.length === 0) operandStart = token.start;
        arrayStack.push([]);
        continue;
      case 'arrayClose': {
        const items = arrayStack.pop() ?? [];
        if (arrayStack.length > 0) {
          arrayStack[arrayStack.length - 1].push({ kind: 'array', items });
        } else {
          if (operands.length === 0 && operandStart < 0) operandStart = token.start;
          operands.push({ kind: 'array', items });
        }
        continue;
      }
      case 'dictOpen':
        if (arrayStack.length === 0 && operands.length === 0) operandStart = token.start;
        dictDepth++;
        continue;
      case 'dictClose':
        dictDepth = Math.max(0, dictDepth - 1);
        if (dictDepth === 0) pushOperand({ kind: 'dict' }, token.start);
        continue;
      case 'inlineImage':
        operands = [];
        operandStart = -1;
        continue;
      case 'operator':
        break;
    }

    const op = token.operator ?? '';
    const start = operandStart >= 0 ? operandStart : token.start;

    switch (op) {
      case 'q':
        stack.push(cloneState(gs));
        break;
      case 'Q': {
        const restored = stack.pop();
        if (restored) gs = restored;
        break;
      }
      case 'cm': {
        if (operands.length >= 6) {
          const m: Matrix = [numAt(0), numAt(1), numAt(2), numAt(3), numAt(4), numAt(5)];
          gs.ctm = multiply(m, gs.ctm);
        }
        break;
      }
      case 'BT':
        tm = [...IDENTITY] as Matrix;
        tlm = [...IDENTITY] as Matrix;
        break;
      case 'ET':
        break;
      case 'Tf': {
        gs.fontSize = numAt(1);
        const fontName = operands[0]?.kind === 'name' ? operands[0].value : '';
        const { object } = lookupResource(resources, 'Font', fontName);
        gs.font = object instanceof PDFDict ? readFontMetrics(object) : FALLBACK_FONT_METRICS;
        break;
      }
      case 'Tc':
        gs.charSpacing = numAt(0);
        break;
      case 'Tw':
        gs.wordSpacing = numAt(0);
        break;
      case 'Tz':
        gs.hScale = numAt(0) / 100;
        break;
      case 'TL':
        gs.leading = numAt(0);
        break;
      case 'Ts':
        gs.rise = numAt(0);
        break;
      case 'Td': {
        tlm = multiply([1, 0, 0, 1, numAt(0), numAt(1)], tlm);
        tm = [...tlm] as Matrix;
        break;
      }
      case 'TD': {
        gs.leading = -numAt(1);
        tlm = multiply([1, 0, 0, 1, numAt(0), numAt(1)], tlm);
        tm = [...tlm] as Matrix;
        break;
      }
      case 'Tm': {
        if (operands.length >= 6) {
          tlm = [numAt(0), numAt(1), numAt(2), numAt(3), numAt(4), numAt(5)];
          tm = [...tlm] as Matrix;
        }
        break;
      }
      case 'T*': {
        tlm = multiply([1, 0, 0, 1, 0, -gs.leading], tlm);
        tm = [...tlm] as Matrix;
        break;
      }
      case 'Tj': {
        handleShow(stringOperandToItems(operands[0]), start, token.end);
        break;
      }
      case 'TJ': {
        const arr = operands[0];
        const items: ShowItem[] = [];
        if (arr && arr.kind === 'array') {
          for (const entry of arr.items) {
            if (entry.kind === 'number') {
              items.push({ kind: 'adjust', value: entry.value });
            } else if (entry.kind === 'string') {
              const { codes, raw } = splitCodes(entry.bytes, gs.font.twoByte);
              items.push({ kind: 'glyphs', codes, raw });
            }
          }
        }
        handleShow(items, start, token.end);
        break;
      }
      case "'": {
        tlm = multiply([1, 0, 0, 1, 0, -gs.leading], tlm);
        tm = [...tlm] as Matrix;
        handleShow(stringOperandToItems(operands[0]), start, token.end, 'T* ');
        break;
      }
      case '"': {
        gs.wordSpacing = numAt(0);
        gs.charSpacing = numAt(1);
        tlm = multiply([1, 0, 0, 1, 0, -gs.leading], tlm);
        tm = [...tlm] as Matrix;
        const prefix = `${formatNumber(gs.wordSpacing)} Tw ${formatNumber(gs.charSpacing)} Tc T* `;
        handleShow(stringOperandToItems(operands[2]), start, token.end, prefix);
        break;
      }
      case 'Do': {
        const name = operands[0]?.kind === 'name' ? operands[0].value : '';
        if (name) {
          const outcome = handleXObject({
            name,
            resources,
            ctm: gs.ctm,
            boxes,
            context,
            depth,
            visited,
          });
          if (outcome.removeOperator) {
            edits.push({ start, end: token.end, replacement: new Uint8Array() });
            result.imagesRemoved += 1;
          }
          if (outcome.replacement) {
            result.xobjReplacements.push({ name, ref: outcome.replacement });
          }
          if (outcome.bubbleReplacements) {
            result.xobjReplacements.push(...outcome.bubbleReplacements);
          }
          result.glyphsRemoved += outcome.glyphsRemoved;
          result.textOpsModified += outcome.textOpsModified;
          result.imagesRemoved += outcome.imagesRemoved;
        }
        break;
      }
      default:
        break;
    }

    operands = [];
    operandStart = -1;
    arrayStack.length = 0;
    dictDepth = 0;
  }

  if (edits.length === 0 && result.xobjReplacements.length === 0) return result;

  if (edits.length > 0) {
    edits.sort((a, b) => a.start - b.start);
    const chunks: Uint8Array[] = [];
    let cursor = 0;
    for (const edit of edits) {
      if (edit.start < cursor) continue; // overlapping edit — skip defensively
      chunks.push(data.subarray(cursor, edit.start));
      chunks.push(edit.replacement);
      cursor = edit.end;
    }
    chunks.push(data.subarray(cursor));

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    result.bytes = merged;
  }

  result.changed = true;
  return result;
}

/* -------------------------------------------------------------------------- */
/* XObjects                                                                    */
/* -------------------------------------------------------------------------- */

interface XObjectOutcome {
  removeOperator: boolean;
  replacement?: PDFRef;
  bubbleReplacements?: Array<{ name: string; ref: PDFRef }>;
  glyphsRemoved: number;
  textOpsModified: number;
  imagesRemoved: number;
}

function handleXObject(args: {
  name: string;
  resources: PDFDict | undefined;
  ctm: Matrix;
  boxes: Box[];
  context: PDFContext;
  depth: number;
  visited: Set<string>;
}): XObjectOutcome {
  const { name, resources, ctm, boxes, context, depth, visited } = args;
  const empty: XObjectOutcome = {
    removeOperator: false,
    glyphsRemoved: 0,
    textOpsModified: 0,
    imagesRemoved: 0,
  };

  const { object, ref } = lookupResource(resources, 'XObject', name);
  if (!(object instanceof PDFStream)) return empty;

  const subtype = (() => {
    try {
      const value = object.dict.lookupMaybe(PDFName.of('Subtype'), PDFName);
      return value ? value.asString().replace(/^\//, '') : '';
    } catch {
      return '';
    }
  })();

  if (subtype === 'Image') {
    const box = transformBox(ctm, 0, 0, 1, 1);
    const area = boxArea(box);
    if (area <= 0) return empty;
    let covered = 0;
    for (const rect of boxes) covered += intersectionArea(box, rect);
    if (covered / area >= IMAGE_COVERAGE_THRESHOLD) {
      return { ...empty, removeOperator: true };
    }
    return empty;
  }

  if (subtype !== 'Form') return empty;
  if (depth >= MAX_FORM_DEPTH) return empty;

  const key = ref ? ref.toString() : `${name}@${depth}`;
  if (visited.has(key)) return empty;
  visited.add(key);

  try {
    const matrixArr = object.dict.lookupMaybe(PDFName.of('Matrix'), PDFArray);
    let formMatrix: Matrix = [...IDENTITY] as Matrix;
    if (matrixArr && matrixArr.size() === 6) {
      formMatrix = [0, 1, 2, 3, 4, 5].map((i) => {
        try {
          return matrixArr.lookup(i, PDFNumber).asNumber();
        } catch {
          return i === 0 || i === 3 ? 1 : 0;
        }
      }) as Matrix;
    }

    const ownResources = object.dict.lookupMaybe(PDFName.of('Resources'), PDFDict);
    const formResources = ownResources ?? resources;

    const child = processContentStream({
      data: decodeStream(object),
      resources: formResources,
      baseCtm: multiply(formMatrix, ctm),
      boxes,
      context,
      depth: depth + 1,
      visited,
    });

    visited.delete(key);

    if (!child.changed) {
      return {
        ...empty,
        glyphsRemoved: child.glyphsRemoved,
        textOpsModified: child.textOpsModified,
        imagesRemoved: child.imagesRemoved,
      };
    }

    // Copy the form before editing so pages sharing it are unaffected.
    const newDict = object.dict.clone(context);
    newDict.delete(PDFName.of('Filter'));
    newDict.delete(PDFName.of('DecodeParms'));
    newDict.set(PDFName.of('Length'), context.obj(child.bytes.length));

    const bubble: Array<{ name: string; ref: PDFRef }> = [];
    if (child.xobjReplacements.length > 0) {
      if (ownResources) {
        const privateResources = ownResources.clone(context);
        const xobjDict = privateResources.lookupMaybe(PDFName.of('XObject'), PDFDict);
        if (xobjDict) {
          const privateXObj = xobjDict.clone(context);
          for (const entry of child.xobjReplacements) {
            privateXObj.set(PDFName.of(entry.name), entry.ref);
          }
          privateResources.set(PDFName.of('XObject'), privateXObj);
        }
        newDict.set(PDFName.of('Resources'), privateResources);
      } else {
        // The form inherits the parent resources; let the parent re-point them.
        bubble.push(...child.xobjReplacements);
      }
    }

    const newStream = PDFRawStream.of(newDict, child.bytes);
    const newRef = context.register(newStream);

    return {
      removeOperator: false,
      replacement: newRef,
      bubbleReplacements: bubble.length > 0 ? bubble : undefined,
      glyphsRemoved: child.glyphsRemoved,
      textOpsModified: child.textOpsModified,
      imagesRemoved: child.imagesRemoved,
    };
  } catch {
    visited.delete(key);
    return empty;
  }
}

/* -------------------------------------------------------------------------- */
/* Page level                                                                  */
/* -------------------------------------------------------------------------- */

function getPageContentBytes(page: PDFPage): Uint8Array {
  const contents = page.node.Contents();
  if (!contents) return new Uint8Array();

  const streams: PDFStream[] = [];
  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      const entry = page.doc.context.lookup(contents.get(i));
      if (entry instanceof PDFStream) streams.push(entry);
    }
  } else if (contents instanceof PDFStream) {
    streams.push(contents);
  }

  const parts = streams.map((s) => decodeStream(s));
  const total = parts.reduce((sum, p) => sum + p.length + 1, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
    merged[offset] = 0x0a;
    offset += 1;
  }
  return merged.subarray(0, offset);
}

function applyXObjectReplacements(
  page: PDFPage,
  replacements: Array<{ name: string; ref: PDFRef }>,
): void {
  if (replacements.length === 0) return;
  try {
    const context = page.doc.context;
    page.node.normalize();
    const resources = page.node.Resources();
    if (!resources) return;
    const privateResources = resources.clone(context);
    const xobjDict = privateResources.lookupMaybe(PDFName.of('XObject'), PDFDict);
    const privateXObj = xobjDict ? xobjDict.clone(context) : context.obj({});
    for (const entry of replacements) {
      privateXObj.set(PDFName.of(entry.name), entry.ref);
    }
    privateResources.set(PDFName.of('XObject'), privateXObj);
    page.node.set(PDFName.of('Resources'), privateResources);
  } catch {
    /* best effort */
  }
}

/**
 * Removes annotations (links, comments, form widgets, ...) overlapping the
 * redacted area — their content would otherwise still be readable.
 */
function stripOverlappingAnnotations(page: PDFPage, boxes: Box[]): number {
  try {
    const context = page.doc.context;
    const annots = page.node.Annots();
    if (!annots) return 0;

    const kept = PDFArray.withContext(context);
    let removed = 0;

    for (let i = 0; i < annots.size(); i++) {
      const entry = annots.get(i);
      let overlaps = false;
      try {
        const dict = context.lookup(entry, PDFDict);
        const rect = dict?.lookup(PDFName.of('Rect'), PDFArray);
        if (rect && rect.size() === 4) {
          const [ax0, ay0, ax1, ay1] = [0, 1, 2, 3].map((idx) =>
            rect.lookup(idx, PDFNumber).asNumber(),
          );
          const annotBox: Box = {
            x0: Math.min(ax0, ax1),
            y0: Math.min(ay0, ay1),
            x1: Math.max(ax0, ax1),
            y1: Math.max(ay0, ay1),
          };
          overlaps = boxes.some((box) => intersectionArea(annotBox, box) > 0);
        }
      } catch {
        overlaps = false;
      }

      if (overlaps) removed += 1;
      else kept.push(entry);
    }

    if (removed > 0) page.node.set(PDFName.of('Annots'), kept);
    return removed;
  } catch {
    return 0;
  }
}

/** Lower-left corner of the page box the viewer coordinates are relative to. */
function pageOrigin(page: PDFPage): { x: number; y: number } {
  try {
    const crop = page.getCropBox();
    if (crop && Number.isFinite(crop.x) && Number.isFinite(crop.y)) {
      return { x: crop.x, y: crop.y };
    }
  } catch {
    /* fall through */
  }
  try {
    const media = page.getMediaBox();
    return { x: media.x, y: media.y };
  } catch {
    return { x: 0, y: 0 };
  }
}

export interface ApplyRedactionsOptions {
  /** Paint an opaque black rectangle over each redacted area (default true). */
  drawBoxes?: boolean;
}

/**
 * Applies `rects` to `pdfBytes`, physically deleting the covered content.
 * Returns the new document bytes plus statistics about what was removed.
 */
export async function applyRedactions(
  pdfBytes: Uint8Array,
  rects: RedactRect[],
  options: ApplyRedactionsOptions = {},
): Promise<{ bytes: Uint8Array; stats: RedactStats }> {
  const drawBoxes = options.drawBoxes !== false;
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const context = pdfDoc.context;

  const stats: RedactStats = {
    pagesProcessed: 0,
    regionsApplied: 0,
    glyphsRemoved: 0,
    textOpsModified: 0,
    imagesRemoved: 0,
    annotationsRemoved: 0,
    contentStreamsRewritten: 0,
  };

  const byPage = new Map<number, RedactRect[]>();
  for (const rect of rects) {
    if (!Number.isFinite(rect.pageIndex)) continue;
    if (rect.pageIndex < 0 || rect.pageIndex >= pages.length) continue;
    if (!(rect.width > 0) || !(rect.height > 0)) continue;
    const list = byPage.get(rect.pageIndex) ?? [];
    list.push(rect);
    byPage.set(rect.pageIndex, list);
  }

  for (const [pageIndex, pageRects] of byPage) {
    const page = pages[pageIndex];
    const origin = pageOrigin(page);
    const boxes = pageRects.map((r) =>
      rectToBox({
        ...r,
        x: r.x + origin.x,
        y: r.y + origin.y,
      }),
    );

    // 1. Physically strip the content underneath the boxes.
    try {
      const data = getPageContentBytes(page);
      if (data.length > 0) {
        const processed = processContentStream({
          data,
          resources: page.node.Resources(),
          baseCtm: [...IDENTITY] as Matrix,
          boxes,
          context,
          depth: 0,
          visited: new Set<string>(),
        });

        stats.glyphsRemoved += processed.glyphsRemoved;
        stats.textOpsModified += processed.textOpsModified;
        stats.imagesRemoved += processed.imagesRemoved;

        applyXObjectReplacements(page, processed.xobjReplacements);

        if (processed.changed) {
          const newStreamRef = context.register(context.flateStream(processed.bytes));
          page.node.set(PDFName.of('Contents'), context.obj([newStreamRef]));
          stats.contentStreamsRewritten += 1;
        }
      }
    } catch (error) {
      console.error(`Redaction: content rewrite failed on page ${pageIndex + 1}`, error);
    }

    // 2. Remove interactive objects that could leak the hidden content.
    stats.annotationsRemoved += stripOverlappingAnnotations(page, boxes);

    // 3. Paint the black box so the redaction is visible.
    if (drawBoxes) {
      for (const box of boxes) {
        page.drawRectangle({
          x: box.x0,
          y: box.y0,
          width: box.x1 - box.x0,
          height: box.y1 - box.y0,
          color: rgb(0, 0, 0),
          borderWidth: 0,
          opacity: 1,
        });
      }
    }

    stats.pagesProcessed += 1;
    stats.regionsApplied += pageRects.length;
  }

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  return { bytes, stats };
}
