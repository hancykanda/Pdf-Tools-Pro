import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

// Environment-agnostic base64 helpers (no Node `Buffer` dependency, so this
// module works identically in the Node server runtime and in jsdom/vitest).
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64ToBytes(b64: string): Uint8Array {
  const clean = (b64.split(',')[1] || b64).replace(/[^A-Za-z0-9+/]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((clean.length * 6) / 8 - padding);
  let bitBuf = 0;
  let bitCount = 0;
  let out = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = B64.indexOf(clean[i]);
    if (v === -1) continue;
    bitBuf = (bitBuf << 6) | v;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes[out++] = (bitBuf >> bitCount) & 0xff;
    }
  }
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result +=
      B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    result += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    result += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return result;
}

export async function mergePDFs(filesBase64: string[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const base64 of filesBase64) {
    const arrayBuffer = b64ToBytes(base64);
    const doc = await PDFDocument.load(arrayBuffer);
    const pageIndices = doc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(doc, pageIndices);

    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  return await mergedPdf.save();
}

export async function splitPDF(fileBase64: string, pageIndices: number[]): Promise<Uint8Array> {
  const arrayBuffer = b64ToBytes(fileBase64);

  const srcDoc = await PDFDocument.load(arrayBuffer);
  const newDoc = await PDFDocument.create();

  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => {
    newDoc.addPage(page);
  });

  return await newDoc.save();
}

export async function imagesToPDF(
  imagesBase64: string[],
  options: { margin: 'none' | 'small' | 'large' },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (const imgBase64 of imagesBase64) {
    const page = doc.addPage();
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const isPng = imgBase64.includes('image/png');
    const imageBuffer = b64ToBytes(imgBase64);

    let embeddedImage;
    if (isPng) {
      embeddedImage = await doc.embedPng(imageBuffer);
    } else {
      embeddedImage = await doc.embedJpg(imageBuffer);
    }

    let marginSize = 0;
    if (options.margin === 'small') marginSize = 20;
    if (options.margin === 'large') marginSize = 40;

    const targetWidth = pageWidth - marginSize * 2;
    const targetHeight = pageHeight - marginSize * 2;

    const dims = embeddedImage.scaleToFit(targetWidth, targetHeight);

    page.drawImage(embeddedImage, {
      x: marginSize + (targetWidth - dims.width) / 2,
      y: marginSize + (targetHeight - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    });
  }

  return await doc.save();
}

export function base64ToBytes(base64: string): Uint8Array {
  return b64ToBytes(base64);
}

export function bytesToBase64(bytes: Uint8Array, mimeType = 'application/pdf'): string {
  return `data:${mimeType};base64,${bytesToB64(bytes)}`;
}

export function toDataUrl(bytes: Uint8Array, mimeType = 'application/pdf'): string {
  return `data:${mimeType};base64,${bytesToB64(bytes)}`;
}
