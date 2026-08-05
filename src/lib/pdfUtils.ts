import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

export async function mergePDFs(filesBase64: string[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const base64 of filesBase64) {
    const cleanBase64 = base64.split(',')[1] || base64;
    const arrayBuffer = Buffer.from(cleanBase64, 'base64');

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
  const cleanBase64 = fileBase64.split(',')[1] || fileBase64;
  const arrayBuffer = Buffer.from(cleanBase64, 'base64');

  const srcDoc = await PDFDocument.load(arrayBuffer);
  const newDoc = await PDFDocument.create();

  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => {
    newDoc.addPage(page);
  });

  return await newDoc.save();
}

export async function imagesToPDF(imagesBase64: string[], options: { margin: 'none' | 'small' | 'large' }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (const imgBase64 of imagesBase64) {
    const page = doc.addPage();
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const isPng = imgBase64.includes('image/png');
    const cleanBase64 = imgBase64.split(',')[1] || imgBase64;
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

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
  const cleanBase64 = base64.split(',')[1] || base64;
  return Uint8Array.from(Buffer.from(cleanBase64, 'base64'));
}

export function bytesToBase64(bytes: Uint8Array, mimeType = 'application/pdf'): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
}

export function toDataUrl(bytes: Uint8Array, mimeType = 'application/pdf'): string {
  const base64 = Buffer.from(bytes).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}