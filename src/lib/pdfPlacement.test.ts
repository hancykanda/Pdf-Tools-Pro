// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

import { fractionRectToPdf, viewportRectToPdf } from './pdfPlacement';
import { applyRedactions } from './pdfRedact';
import { extractPdfText } from './pdfText';

pdfjs.GlobalWorkerOptions.workerSrc = createRequire(import.meta.url).resolve(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
);

const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;

async function buildPdf(rotation: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('TOPSECRETLINE', { x: 72, y: 700, size: 14, font });
  page.drawText('KEEPTHISLINE', { x: 72, y: 500, size: 14, font });
  if (rotation) page.setRotation(degrees(rotation));
  return doc.save();
}

/** Uses pdf.js itself as the source of truth for the viewport transform. */
async function viewportOf(bytes: Uint8Array) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await doc.getPage(1);
  return page.getViewport({ scale: 1 });
}

describe('viewportRectToPdf', () => {
  for (const rotation of [0, 90, 180, 270]) {
    it(`round-trips a rectangle for /Rotate ${rotation}`, async () => {
      const bytes = await buildPdf(rotation);
      const viewport = await viewportOf(bytes);

      // A rectangle in PDF user space we want to reproduce.
      const target = { x: 100, y: 300, width: 180, height: 40 };

      // Project its corners into viewport (canvas) space with pdf.js.
      const corners = [
        viewport.convertToViewportPoint(target.x, target.y),
        viewport.convertToViewportPoint(target.x + target.width, target.y + target.height),
      ];
      const vx = Math.min(corners[0][0], corners[1][0]);
      const vy = Math.min(corners[0][1], corners[1][1]);
      const vw = Math.abs(corners[1][0] - corners[0][0]);
      const vh = Math.abs(corners[1][1] - corners[0][1]);

      const mapped = viewportRectToPdf(
        { x: vx, y: vy, width: vw, height: vh },
        viewport.width,
        viewport.height,
        rotation,
      );

      expect(mapped.x).toBeCloseTo(target.x, 4);
      expect(mapped.y).toBeCloseTo(target.y, 4);
      expect(mapped.width).toBeCloseTo(target.width, 4);
      expect(mapped.height).toBeCloseTo(target.height, 4);
    });
  }

  it('accepts fractional rectangles from the browser overlay', () => {
    const rect = fractionRectToPdf(
      { x: 0.1, y: 0.25, width: 0.5, height: 0.125 },
      PAGE_WIDTH,
      PAGE_HEIGHT,
      0,
    );
    expect(rect).toEqual({ x: 60, y: 500, width: 300, height: 100 });
  });
});

describe('redaction through the browser coordinate pipeline', () => {
  for (const rotation of [0, 90, 180, 270]) {
    it(`removes the covered line on a page rotated ${rotation}°`, async () => {
      const bytes = await buildPdf(rotation);
      const viewport = await viewportOf(bytes);

      // Where the secret line sits in the rendered page, as the user sees it.
      const corners = [
        viewport.convertToViewportPoint(70, 696),
        viewport.convertToViewportPoint(240, 716),
      ];
      const rect = {
        x: Math.min(corners[0][0], corners[1][0]),
        y: Math.min(corners[0][1], corners[1][1]),
        width: Math.abs(corners[1][0] - corners[0][0]),
        height: Math.abs(corners[1][1] - corners[0][1]),
      };

      const pdfRect = viewportRectToPdf(rect, viewport.width, viewport.height, rotation);
      const { bytes: out, stats } = await applyRedactions(bytes, [{ pageIndex: 0, ...pdfRect }]);

      expect(stats.glyphsRemoved).toBeGreaterThan(0);
      const text = await extractPdfText(Buffer.from(out));
      expect(text).not.toContain('TOPSECRETLINE');
      expect(text).toContain('KEEPTHISLINE');
    });
  }
});
