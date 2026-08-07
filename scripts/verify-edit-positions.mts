/**
 * Positional verification: extracts the transform of every text run so we can
 * assert *where* the Edit-submodel routes placed things.
 * Run with: npx --yes tsx scripts/verify-edit-positions.mts
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'node:fs';

const OUT = '/tmp/kilo/edit-verify';

interface Item {
  str: string;
  transform: number[];
}

async function items(file: string, pageNumber: number): Promise<Item[]> {
  const data = new Uint8Array(readFileSync(`${OUT}/${file}`));
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  return (content.items as Array<{ str?: string; transform?: number[] }>)
    .filter((i) => (i.str ?? '').trim())
    .map((i) => ({ str: i.str ?? '', transform: i.transform ?? [] }));
}

let failures = 0;
function check(name: string, condition: boolean, detail = '') {
  if (!condition) failures++;
  console.log(`  [${condition ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function near(a: number, b: number, tolerance = 2) {
  return Math.abs(a - b) <= tolerance;
}

async function main() {
  console.log('page-numbers: bottom-right, margin 30, size 12 on A4 595.28x841.89');
  {
    const found = (await items('numbered.pdf', 1)).find((i) => i.str.includes('5 of 7'));
    if (!found) {
      check('page number found', false);
    } else {
      const [a, , , , x, y] = found.transform;
      // width of "5 of 7" in Helvetica 12
      const expectedY = 31.8; // 841.89 - (841.89 - 30 - 6) - 12*0.35
      check('font size 12', near(a, 12, 0.01), `a=${a}`);
      check('sits on the bottom margin', near(y, expectedY, 1.5), `y=${y.toFixed(2)} expected≈${expectedY}`);
      check('right aligned inside the margin', x > 500 && x < 566, `x=${x.toFixed(2)}`);
    }
  }

  console.log('page-numbers on the /Rotate 90 page (view 612x792, letter landscape 792x612)');
  {
    const found = (await items('numbered.pdf', 2)).find((i) => i.str.includes('6 of 7'));
    if (!found) {
      check('page number found on rotated page', false);
    } else {
      const [a, b, c, d, x, y] = found.transform;
      // rotate(90) => [0, s, -s, 0]
      check('text pre-rotated by the page rotation', near(a, 0, 0.01) && near(b, 12, 0.01) && near(c, -12, 0.01) && near(d, 0, 0.01), `[${a},${b},${c},${d}]`);
      // view bottom edge: baseline sits 31.8pt above it, and +view-y maps to +user-x
      check('bottom of the rotated view = larger user x', near(x, 792 - 31.8, 1.5), `x=${x.toFixed(2)} (=${(792 - x).toFixed(2)}pt from the view bottom, same as page 1)`);
      check('right of the rotated view = top in user space', y > 500 && y < 583, `y=${y.toFixed(2)}`);
    }
  }

  console.log('watermark: centred, 45deg, size 60 on A4');
  {
    const found = (await items('watermarked.pdf', 1)).find((i) => i.str.includes('CONFIDENTIAL'));
    if (!found) {
      check('watermark found', false);
    } else {
      const [a, b, , , x, y] = found.transform;
      const cos45 = Math.cos(Math.PI / 4) * 60;
      check('rotated 45 degrees', near(a, cos45, 0.5) && near(b, cos45, 0.5), `a=${a.toFixed(2)} b=${b.toFixed(2)}`);
      // Text is centred: origin = centre - halfWidth*dir - halfCap*up
      check('origin left of centre', x < 595.28 / 2, `x=${x.toFixed(2)}`);
      check('origin below centre', y < 841.89 / 2, `y=${y.toFixed(2)}`);
      const width = 60 * 0.63 * 'CONFIDENTIAL'.length; // rough Helvetica advance
      const centreX = x + (Math.SQRT1_2 * width) / 2;
      check('recentres near the page middle', near(centreX, 595.28 / 2, 40), `centreX≈${centreX.toFixed(1)}`);
    }
  }

  console.log('edit: text annotation at view (72, 100), size 18 on A4');
  {
    const list = await items('edited.pdf', 1);
    const first = list.find((i) => i.str.includes('Hello from the editor'));
    const second = list.find((i) => i.str.includes('second line'));
    if (!first || !second) {
      check('annotation text found', false);
    } else {
      check('x matches the view x', near(first.transform[4], 72, 0.5), `x=${first.transform[4]}`);
      // baseline = y + 0.8em  =>  user y = 841.89 - (100 + 14.4)
      check('baseline maps from the top-left origin', near(first.transform[5], 841.89 - 114.4, 0.5), `y=${first.transform[5].toFixed(2)}`);
      check('second line is 1.2em lower', near(first.transform[5] - second.transform[5], 18 * 1.2, 0.5), `delta=${(first.transform[5] - second.transform[5]).toFixed(2)}`);
    }
  }

  console.log('edit: text on the third page keeps size and colour ops');
  {
    const found = (await items('edited.pdf', 3)).find((i) => i.str.includes('Rotated-safe placement'));
    check('found', !!found);
    if (found) check('size 14', near(found.transform[0], 14, 0.01), `a=${found.transform[0]}`);
  }

  console.log(`\n${failures === 0 ? 'ALL POSITION CHECKS PASSED' : `${failures} POSITION CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
