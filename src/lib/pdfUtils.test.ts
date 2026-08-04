import { describe, it, expect } from 'vitest';
import {
  mergePDFs,
  splitPDF,
  imagesToPDF,
  base64ToBytes,
  bytesToBase64,
} from './pdfUtils';
import { PDFDocument } from 'pdf-lib';

async function createValidPDF(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const { width, height } = page.getSize();
  doc.save();
  return doc.save();
}

function toBase64DataUrl(bytes: Uint8Array): string {
  return `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`;
}

describe('pdfUtils', () => {
  describe('base64ToBytes', () => {
    it('converts a base64 string to Uint8Array', () => {
      const base64 = 'SGVsbG8gV29ybGQ=';
      const result = base64ToBytes(base64);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('strips data URL prefix before decoding', () => {
      const base64 = 'data:application/pdf;base64,SGVsbG8gV29ybGQ=';
      const result = base64ToBytes(base64);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns empty array for empty string', () => {
      const result = base64ToBytes('');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });
  });

  describe('bytesToBase64', () => {
    it('converts Uint8Array to base64 data URL', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = bytesToBase64(bytes);
      expect(result).toMatch(/^data:application\/pdf;base64,/);
      expect(result.length).toBeGreaterThan(30);
    });

    it('uses custom mimeType when provided', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const result = bytesToBase64(bytes, 'image/png');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('mergePDFs', () => {
    it('merges two valid PDFs into a single PDF', async () => {
      const pdf1 = await createValidPDF();
      const pdf2 = await createValidPDF();
      const b64_1 = toBase64DataUrl(pdf1);
      const b64_2 = toBase64DataUrl(pdf2);

      const result = await mergePDFs([b64_1, b64_2]);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);

      const resultDoc = await PDFDocument.load(result);
      expect(resultDoc.getPageCount()).toBe(2);
    });

    it('merges a single PDF', async () => {
      const pdf = await createValidPDF();
      const b64 = toBase64DataUrl(pdf);

      const result = await mergePDFs([b64]);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('throws on invalid base64 data', async () => {
      await expect(mergePDFs(['invalid-data'])).rejects.toThrow();
    });
  });

  describe('splitPDF', () => {
    it('splits a PDF and returns a valid PDF with selected pages', async () => {
      const doc = await PDFDocument.create();
      doc.addPage();
      doc.addPage();
      doc.addPage();
      const pdfBytes = await doc.save();
      const b64 = toBase64DataUrl(pdfBytes);

      const result = await splitPDF(b64, [0, 2]);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);

      const resultDoc = await PDFDocument.load(result);
      expect(resultDoc.getPageCount()).toBe(2);
    });

    it('throws on invalid base64 data', async () => {
      await expect(splitPDF('invalid-data', [0])).rejects.toThrow();
    });
  });

  describe('imagesToPDF', () => {
    it('creates a PDF from image base64 strings with no margin', async () => {
      const pngHeader = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const imgBase64 = `data:image/png;base64,${pngHeader}`;

      const result = await imagesToPDF([imgBase64], { margin: 'none' });
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('creates a PDF from image base64 strings with small margin', async () => {
      const pngHeader = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const imgBase64 = `data:image/png;base64,${pngHeader}`;

      const result = await imagesToPDF([imgBase64], { margin: 'small' });
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('creates a PDF from image base64 strings with large margin', async () => {
      const pngHeader = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const imgBase64 = `data:image/png;base64,${pngHeader}`;

      const result = await imagesToPDF([imgBase64], { margin: 'large' });
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('throws on invalid image data', async () => {
      await expect(
        imagesToPDF(['invalid-data'], { margin: 'none' })
      ).rejects.toThrow();
    });
  });
});