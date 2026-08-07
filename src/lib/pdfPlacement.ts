/**
 * Maps rectangles drawn on a rendered page (browser canvas coordinates, origin
 * top-left) to PDF user-space rectangles (origin bottom-left) used by pdf-lib.
 *
 * Shared by the Sign and Redact tools. Page rotation (/Rotate 90/180/270) is
 * taken into account: pdf.js renders the rotated page, pdf-lib works in the
 * unrotated coordinate system.
 *
 * Coordinates are relative to the visible page box; the server adds the
 * CropBox/MediaBox origin.
 */

export interface ViewportRect {
  /** Distance from the left edge of the rendered page, in points. */
  x: number;
  /** Distance from the top edge of the rendered page, in points. */
  y: number;
  width: number;
  height: number;
}

export interface PdfRect {
  /** Distance from the left edge of the page, in points. */
  x: number;
  /** Distance from the bottom edge of the page, in points. */
  y: number;
  width: number;
  height: number;
}

export function normalizeRotation(rotation: number | undefined): 0 | 90 | 180 | 270 {
  const value = (((rotation ?? 0) % 360) + 360) % 360;
  if (value === 90 || value === 180 || value === 270) return value;
  return 0;
}

/**
 * @param rect            rectangle in rendered-page points (top-left origin)
 * @param viewportWidth   width of the rendered page in points (rotation applied)
 * @param viewportHeight  height of the rendered page in points (rotation applied)
 * @param rotation        the page's /Rotate value
 */
export function viewportRectToPdf(
  rect: ViewportRect,
  viewportWidth: number,
  viewportHeight: number,
  rotation = 0,
): PdfRect {
  const rot = normalizeRotation(rotation);
  const swapped = rot === 90 || rot === 270;

  // Unrotated page size.
  const pageWidth = swapped ? viewportHeight : viewportWidth;
  const pageHeight = swapped ? viewportWidth : viewportHeight;

  const { x, y, width, height } = rect;

  switch (rot) {
    case 90:
      return { x: y, y: x, width: height, height: width };
    case 180:
      return { x: pageWidth - (x + width), y, width, height };
    case 270:
      return {
        x: pageWidth - (y + height),
        y: pageHeight - (x + width),
        width: height,
        height: width,
      };
    default:
      return { x, y: pageHeight - (y + height), width, height };
  }
}

/** Fractional (0..1) rectangle on the displayed page → PDF user-space rect. */
export function fractionRectToPdf(
  fraction: { x: number; y: number; width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
  rotation = 0,
): PdfRect {
  return viewportRectToPdf(
    {
      x: fraction.x * viewportWidth,
      y: fraction.y * viewportHeight,
      width: fraction.width * viewportWidth,
      height: fraction.height * viewportHeight,
    },
    viewportWidth,
    viewportHeight,
    rotation,
  );
}
