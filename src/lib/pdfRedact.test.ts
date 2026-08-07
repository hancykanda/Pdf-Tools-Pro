// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

import { applyRedactions } from './pdfRedact';
import { extractPdfText } from './pdfText';

// Outside of the Next.js bundler the `new URL(..., import.meta.url)` worker
// path used by `pdfText.ts` cannot be resolved, so point pdf.js at the real
// file on disk for the test run.
pdfjs.GlobalWorkerOptions.workerSrc = createRequire(import.meta.url).resolve(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
);

async function buildSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText('SECRETCODE 4815162342', { x: 72, y: 700, size: 14, font, color: rgb(0, 0, 0) });
  page.drawText('PUBLICLINE stays visible', { x: 72, y: 600, size: 14, font });
  page.drawText('ALPHA BETAWORD GAMMA', { x: 72, y: 500, size: 14, font });

  return doc.save();
}

describe('applyRedactions', () => {
  it('physically removes the text under a redaction box', async () => {
    const pdf = await buildSamplePdf();
    const before = await extractPdfText(Buffer.from(pdf));
    expect(before).toContain('SECRETCODE');
    expect(before).toContain('PUBLICLINE');

    const { bytes, stats } = await applyRedactions(pdf, [
      { pageIndex: 0, x: 60, y: 692, width: 260, height: 26 },
    ]);

    const after = await extractPdfText(Buffer.from(bytes));

    expect(stats.glyphsRemoved).toBeGreaterThan(0);
    expect(stats.contentStreamsRewritten).toBe(1);
    expect(after).not.toContain('SECRETCODE');
    expect(after).not.toContain('4815162342');
    // Untouched lines survive.
    expect(after).toContain('PUBLICLINE');
    expect(after).toContain('GAMMA');
  });

  it('only strips the glyphs inside the box on a partially covered line', async () => {
    const pdf = await buildSamplePdf();

    // "ALPHA " is ~46pt wide at size 14; cover just the middle word.
    const { bytes } = await applyRedactions(pdf, [
      { pageIndex: 0, x: 118, y: 494, width: 78, height: 22 },
    ]);

    const after = await extractPdfText(Buffer.from(bytes));
    expect(after).toContain('ALPHA');
    expect(after).toContain('GAMMA');
    expect(after).not.toContain('BETAWORD');
  });

  it('leaves the document untouched when no glyph intersects', async () => {
    const pdf = await buildSamplePdf();
    const { bytes, stats } = await applyRedactions(pdf, [
      { pageIndex: 0, x: 10, y: 10, width: 30, height: 20 },
    ]);

    expect(stats.glyphsRemoved).toBe(0);
    const after = await extractPdfText(Buffer.from(bytes));
    expect(after).toContain('SECRETCODE');
    expect(after).toContain('ALPHA');
  });

  it('strips text inside a form XObject without affecting pages that share it', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const context = doc.context;

    const encode = (value: string) => {
      const out = new Uint8Array(value.length);
      for (let i = 0; i < value.length; i++) out[i] = value.charCodeAt(i);
      return out;
    };

    const formContent = encode(
      'BT /F1 14 Tf 72 700 Td (FORMSECRET) Tj ET BT /F1 14 Tf 72 600 Td (FORMKEEP) Tj ET',
    );
    const formRef = context.register(
      PDFRawStream.of(
        context.obj({
          Type: 'XObject',
          Subtype: 'Form',
          BBox: [0, 0, 600, 800],
          Resources: { Font: { F1: font.ref } },
          Length: formContent.length,
        }),
        formContent,
      ),
    );

    // Two pages painting the very same form XObject.
    for (let i = 0; i < 2; i++) {
      const page = doc.addPage([600, 800]);
      page.node.normalize();
      page.node.setXObject(PDFName.of('Fm0'), formRef);
      const ref = context.register(context.flateStream(encode('q /Fm0 Do Q')));
      page.node.set(PDFName.of('Contents'), context.obj([ref]));
    }

    const { bytes } = await applyRedactions(await doc.save(), [
      { pageIndex: 0, x: 60, y: 692, width: 200, height: 26 },
    ]);

    const [page1, page2] = (await extractPdfText(Buffer.from(bytes))).split('\n\n');
    expect(page1).not.toContain('FORMSECRET');
    expect(page1).toContain('FORMKEEP');
    expect(page2).toContain('FORMSECRET');
  });
});
