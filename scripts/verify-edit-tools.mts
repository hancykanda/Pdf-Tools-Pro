/**
 * Temporary verification harness for the Edit submodel routes.
 * Run with: npx --yes tsx scripts/verify-edit-tools.mts
 */
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { writeFileSync } from 'node:fs';

import { POST as rotatePost } from '../src/app/api/tools/rotate-pdf/route';
import { POST as numbersPost } from '../src/app/api/tools/page-numbers/route';
import { POST as watermarkPost } from '../src/app/api/tools/watermark/route';
import { POST as cropPost } from '../src/app/api/tools/crop-pdf/route';
import { POST as editPost } from '../src/app/api/tools/edit-pdf/route';

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const OUT = '/tmp/kilo/edit-verify';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

let failures = 0;
function check(name: string, condition: boolean, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (!condition) failures++;
  console.log(`  [${status}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function makeSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // page 1: A4 portrait
  const p1 = doc.addPage([595.28, 841.89]);
  p1.drawText('Sample document page one', { x: 60, y: 760, size: 18, font, color: rgb(0, 0, 0) });
  p1.drawRectangle({ x: 60, y: 400, width: 200, height: 120, borderColor: rgb(0, 0, 1), borderWidth: 2 });

  // page 2: letter landscape, pre-rotated 90 to exercise the geometry mapping
  const p2 = doc.addPage([792, 612]);
  p2.setRotation(degrees(90));
  p2.drawText('Rotated page two', { x: 60, y: 300, size: 18, font });

  // page 3
  const p3 = doc.addPage([595.28, 841.89]);
  p3.drawText('Third page content', { x: 60, y: 700, size: 14, font });

  return doc.save();
}

async function makeSamplePng(): Promise<Uint8Array> {
  // 4x4 red PNG produced with pdf-lib-free minimal encoder (hand-built zlib-stored PNG).
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
    'base64'
  );
  return new Uint8Array(png);
}

function formRequest(url: string, file: Uint8Array, options: unknown, extra?: Record<string, Blob>) {
  const form = new FormData();
  form.append('file', new File([Buffer.from(file)], 'sample.pdf', { type: 'application/pdf' }));
  form.append('options', JSON.stringify(options));
  for (const [key, value] of Object.entries(extra ?? {})) form.append(key, value);
  return new Request(url, { method: 'POST', body: form });
}

async function readPdf(response: Response, label: string): Promise<Uint8Array> {
  const type = response.headers.get('content-type');
  if (response.status !== 200 || type !== 'application/pdf') {
    const text = await response.text();
    throw new Error(`${label}: unexpected response ${response.status} ${type} ${text.slice(0, 300)}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(`${OUT}/${label}.pdf`, bytes);
  return bytes;
}

async function extractText(bytes: Uint8Array): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push((content.items as Array<{ str?: string }>).map((item) => item.str ?? '').join(' '));
  }
  return pages;
}

async function main() {
  const sample = await makeSamplePdf();
  writeFileSync(`${OUT}/sample.pdf`, sample);
  console.log(`Sample PDF: ${sample.byteLength} bytes, 3 pages\n`);

  /* ---------------- rotate ---------------- */
  console.log('rotate-pdf');
  {
    const res = await rotatePost(
      formRequest('http://t/api/tools/rotate-pdf', sample, { rotations: [90, 180, -90] }) as never
    );
    const bytes = await readPdf(res, 'rotated');
    const doc = await PDFDocument.load(bytes);
    const angles = doc.getPages().map((p) => p.getRotation().angle);
    check('per-page rotations applied', JSON.stringify(angles) === JSON.stringify([90, 270, 270]), `angles=${angles}`);
    check('page count preserved', doc.getPageCount() === 3);
    check('valid PDF header', Buffer.from(bytes.slice(0, 5)).toString() === '%PDF-');

    const uniform = await rotatePost(
      formRequest('http://t/api/tools/rotate-pdf', sample, { rotation: 180 }) as never
    );
    const uniformDoc = await PDFDocument.load(await readPdf(uniform, 'rotated-all'));
    const uniformAngles = uniformDoc.getPages().map((p) => p.getRotation().angle);
    check('rotate all adds to existing rotation', JSON.stringify(uniformAngles) === JSON.stringify([180, 270, 180]), `angles=${uniformAngles}`);
  }

  /* ---------------- page numbers ---------------- */
  console.log('page-numbers');
  {
    const res = await numbersPost(
      formRequest('http://t/api/tools/page-numbers', sample, {
        position: 'bottom-right',
        startNumber: 5,
        format: '{n} of {total}',
        fontSize: 12,
        margin: 30,
      }) as never
    );
    const bytes = await readPdf(res, 'numbered');
    const pages = await extractText(bytes);
    check('first page numbered from start number', pages[0].includes('5 of 7'), pages[0].slice(-30));
    check('last page numbered', pages[2].includes('7 of 7'), pages[2].slice(-30));
    check('original text kept', pages[0].includes('Sample document page one'));

    const ranged = await numbersPost(
      formRequest('http://t/api/tools/page-numbers', sample, {
        position: 'top-center',
        startNumber: 1,
        format: 'Page {n}',
        firstPage: 2,
        lastPage: 3,
      }) as never
    );
    const rangedPages = await extractText(await readPdf(ranged, 'numbered-range'));
    check('page range honoured', !rangedPages[0].includes('Page 1') && rangedPages[1].includes('Page 1') && rangedPages[2].includes('Page 2'));

    const bad = await numbersPost(
      formRequest('http://t/api/tools/page-numbers', sample, { format: 'no placeholder' }) as never
    );
    check('invalid format rejected', bad.status === 400);
  }

  /* ---------------- watermark ---------------- */
  console.log('watermark');
  {
    const res = await watermarkPost(
      formRequest('http://t/api/tools/watermark', sample, {
        mode: 'text',
        text: 'CONFIDENTIAL',
        opacity: 0.25,
        rotation: 45,
        position: 'center',
        fontSize: 60,
      }) as never
    );
    const bytes = await readPdf(res, 'watermarked');
    const pages = await extractText(bytes);
    check('watermark text on every page', pages.every((p) => p.includes('CONFIDENTIAL')));
    check('original content preserved', pages[0].includes('Sample document page one'));

    const tiled = await watermarkPost(
      formRequest('http://t/api/tools/watermark', sample, {
        mode: 'text',
        text: 'DRAFT',
        tile: true,
        opacity: 0.15,
        rotation: 45,
        fontSize: 24,
        pages: '1,3',
      }) as never
    );
    const tiledBytes = await readPdf(tiled, 'watermarked-tiled');
    const tiledPages = await extractText(tiledBytes);
    const occurrences = (tiledPages[0].match(/DRAFT/g) || []).length;
    check('tiled watermark repeats', occurrences > 4, `${occurrences} copies on page 1`);
    check('page selection honoured', !tiledPages[1].includes('DRAFT') && tiledPages[2].includes('DRAFT'));

    const png = await makeSamplePng();
    const imageRes = await watermarkPost(
      formRequest(
        'http://t/api/tools/watermark',
        sample,
        { mode: 'image', opacity: 0.4, scale: 0.3, position: 'bottom-right', rotation: 0 },
        { image: new File([Buffer.from(png)], 'logo.png', { type: 'image/png' }) }
      ) as never
    );
    const imageBytes = await readPdf(imageRes, 'watermarked-image');
    const imageDoc = await PDFDocument.load(imageBytes);
    check('image watermark produces valid PDF', imageDoc.getPageCount() === 3);
    check('image watermark grew the file', imageBytes.byteLength > sample.byteLength);

    const missing = await watermarkPost(
      formRequest('http://t/api/tools/watermark', sample, { mode: 'text', text: '' }) as never
    );
    check('empty watermark text rejected', missing.status === 400);
  }

  /* ---------------- crop ---------------- */
  console.log('crop-pdf');
  {
    const res = await cropPost(
      formRequest('http://t/api/tools/crop-pdf', sample, {
        crop: { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 },
        applyToAll: true,
      }) as never
    );
    const bytes = await readPdf(res, 'cropped');
    const doc = await PDFDocument.load(bytes);
    const p1 = doc.getPage(0).getCropBox();
    check(
      'page 1 cropped to 80% of A4',
      Math.abs(p1.width - 595.28 * 0.8) < 0.5 && Math.abs(p1.height - 841.89 * 0.8) < 0.5,
      `${p1.width.toFixed(2)} x ${p1.height.toFixed(2)}`
    );
    check('crop origin offset', Math.abs(p1.x - 595.28 * 0.1) < 0.5 && Math.abs(p1.y - 841.89 * 0.1) < 0.5, `x=${p1.x.toFixed(2)} y=${p1.y.toFixed(2)}`);
    const p2 = doc.getPage(1).getCropBox();
    check(
      'rotated page cropped in view space (axes swapped)',
      Math.abs(p2.width - 792 * 0.8) < 0.5 && Math.abs(p2.height - 612 * 0.8) < 0.5,
      `${p2.width.toFixed(2)} x ${p2.height.toFixed(2)}`
    );
    check('media box follows crop box', Math.abs(doc.getPage(0).getMediaBox().width - p1.width) < 0.01);

    const single = await cropPost(
      formRequest('http://t/api/tools/crop-pdf', sample, {
        crop: { left: 0.2, top: 0, right: 0, bottom: 0 },
        applyToAll: false,
        pageIndex: 2,
      }) as never
    );
    const singleDoc = await PDFDocument.load(await readPdf(single, 'cropped-single'));
    check(
      'apply-to-all off crops only the chosen page',
      Math.abs(singleDoc.getPage(0).getCropBox().width - 595.28) < 0.01 &&
        Math.abs(singleDoc.getPage(2).getCropBox().width - 595.28 * 0.8) < 0.5
    );

    const legacy = await cropPost(
      formRequest('http://t/api/tools/crop-pdf', sample, { top: 20, bottom: 20, left: 10, right: 10 }) as never
    );
    const legacyDoc = await PDFDocument.load(await readPdf(legacy, 'cropped-legacy'));
    check('legacy point margins still work', Math.abs(legacyDoc.getPage(0).getCropBox().width - (595.28 - 20)) < 0.01);

    const tooSmall = await cropPost(
      formRequest('http://t/api/tools/crop-pdf', sample, { crop: { left: 0.5, top: 0, right: 0.49, bottom: 0 } }) as never
    );
    check('degenerate crop rejected', tooSmall.status === 400);
  }

  /* ---------------- edit ---------------- */
  console.log('edit-pdf');
  {
    const png = await makeSamplePng();
    const res = await editPost(
      formRequest(
        'http://t/api/tools/edit-pdf',
        sample,
        {
          annotations: [
            { type: 'text', page: 0, x: 72, y: 100, text: 'Hello from the editor\nsecond line', fontSize: 18, color: '#c00000' },
            { type: 'rect', page: 0, x: 50, y: 200, width: 200, height: 90, color: '#0055ff', strokeWidth: 3, fill: '#e0f0ff', opacity: 0.9 },
            { type: 'ellipse', page: 0, x: 300, y: 200, width: 120, height: 80, color: '#008000', strokeWidth: 2 },
            { type: 'line', page: 1, x1: 40, y1: 40, x2: 300, y2: 220, color: '#ff00ff', strokeWidth: 4 },
            { type: 'draw', page: 1, points: [[50, 300], [80, 320], [120, 290], [160, 340]], color: '#111111', strokeWidth: 2 },
            { type: 'image', page: 2, x: 100, y: 120, width: 160, height: 160, assetId: 'a1' },
            { type: 'text', page: 2, x: 60, y: 500, text: 'Rotated-safe placement', fontSize: 14, color: '#000000' },
          ],
        },
        { 'asset:a1': new File([Buffer.from(png)], 'stamp.png', { type: 'image/png' }) }
      ) as never
    );
    const bytes = await readPdf(res, 'edited');
    check('edits applied header', res.headers.get('X-Edits-Applied') === '7', String(res.headers.get('X-Edits-Applied')));

    const doc = await PDFDocument.load(bytes);
    check('page count preserved', doc.getPageCount() === 3);
    const pages = await extractText(bytes);
    check('text annotation written', pages[0].includes('Hello from the editor') && pages[0].includes('second line'));
    check('text on page 3 written', pages[2].includes('Rotated-safe placement'));
    check('existing content untouched', pages[1].includes('Rotated page two'));
    check('output larger than input (image embedded)', bytes.byteLength > sample.byteLength);

    const legacy = await editPost(
      new Request('http://t/api/tools/edit-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: `data:application/pdf;base64,${Buffer.from(sample).toString('base64')}`,
          overlayText: 'Legacy stamp',
          xPosition: 40,
          yPosition: 40,
          fontSize: 20,
        }),
      }) as never
    );
    const legacyPages = await extractText(await readPdf(legacy, 'edited-legacy'));
    check('legacy JSON payload still works', legacyPages.every((p) => p.includes('Legacy stamp')));

    const empty = await editPost(formRequest('http://t/api/tools/edit-pdf', sample, { annotations: [] }) as never);
    check('empty edit rejected', empty.status === 400);
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  console.log(`Artifacts in ${OUT}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
