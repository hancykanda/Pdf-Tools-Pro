import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

export async function mergePDFs(filesBase64: string[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const base64 of filesBase64) {
    const cleanBase64 = base64.split(',')[1] || base64;
    const arrayBuffer = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));

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
  const arrayBuffer = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));

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

    let embeddedImage;
    const isPng = imgBase64.includes('image/png');
    const cleanBase64 = imgBase64.split(',')[1] || imgBase64;

    if (isPng) {
      embeddedImage = await doc.embedPng(cleanBase64);
    } else {
      embeddedImage = await doc.embedJpg(cleanBase64);
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

export function toDataUrl(bytes: Uint8Array, mimeType = 'application/pdf') {
  const blob = new Blob([Buffer.from(bytes)], { type: mimeType });
  return URL.createObjectURL(blob);
}