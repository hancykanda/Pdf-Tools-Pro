import { NextRequest } from 'next/server';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const PAGE_WIDTH = 841.89; // A4 landscape
const PAGE_HEIGHT = 595.28;
const MARGIN = 32;
const FONT_SIZE = 8;
const HEADER_FONT_SIZE = 8.5;
const ROW_HEIGHT = 14;
const CELL_PADDING = 4;
const MAX_COL_WIDTH = 220;
const MIN_COL_WIDTH = 28;
const MAX_ROWS_PER_SHEET = 2000;
const MAX_COLS = 40;

/** pdf-lib standard fonts use WinAnsi encoding; drop anything it cannot encode. */
function sanitize(value: string): string {
  return value
    .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/[^\u0020-\u007E\u00A1-\u00FF]/g, '?');
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return sanitize(String(value));
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (!text) return '';
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid)}...`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return low > 0 ? `${text.slice(0, low)}...` : '';
}

export async function POST(request: NextRequest) {
  let file: File | null = null;

  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
  } catch {
    return Response.json({ error: 'Invalid form data. Upload the spreadsheet as multipart/form-data.' }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return Response.json({ error: 'Excel file is required' }, { status: 400 });
  }

  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ];
  const validExts = ['.xls', '.xlsx', '.csv'];
  const hasValidType = validTypes.includes(file.type);
  const hasValidExt = validExts.some((ext) => file!.name.toLowerCase().endsWith(ext));

  if (!hasValidType && !hasValidExt) {
    return Response.json({ error: 'Please upload a valid Excel file (.xls, .xlsx, or .csv)' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      return Response.json({ error: 'Could not read the uploaded spreadsheet. It may be corrupted or password protected.' }, { status: 400 });
    }

    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return Response.json({ error: 'The uploaded spreadsheet contains no sheets' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const usableWidth = PAGE_WIDTH - MARGIN * 2;

    const cursor: { page: PDFPage; y: number } = {
      page: pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
      y: PAGE_HEIGHT - MARGIN,
    };
    let firstPageUnused = true;

    const newPage = (): PDFPage => {
      if (firstPageUnused) {
        firstPageUnused = false;
      } else {
        cursor.page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      }
      cursor.y = PAGE_HEIGHT - MARGIN;
      return cursor.page;
    };

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawRows: unknown[][] = sheet
        ? (XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: false, defval: '' }) as unknown[][])
        : [];

      const rows = rawRows
        .slice(0, MAX_ROWS_PER_SHEET)
        .map((row) => (Array.isArray(row) ? row.slice(0, MAX_COLS).map(cellToString) : []));

      const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

      // Column widths: widest cell per column, capped, then scaled to fit the page.
      let colWidths: number[] = [];
      if (columnCount > 0) {
        colWidths = new Array(columnCount).fill(MIN_COL_WIDTH);
        for (const row of rows) {
          for (let c = 0; c < columnCount; c++) {
            const text = row[c] || '';
            if (!text) continue;
            const width = font.widthOfTextAtSize(text, FONT_SIZE) + CELL_PADDING * 2;
            colWidths[c] = Math.max(colWidths[c], Math.min(width, MAX_COL_WIDTH));
          }
        }
        const total = colWidths.reduce((sum, w) => sum + w, 0);
        if (total > usableWidth) {
          const scale = usableWidth / total;
          colWidths = colWidths.map((w) => Math.max(MIN_COL_WIDTH * scale, w * scale));
        }
      }

      // Sheet title
      const current = newPage();
      const title = truncateToWidth(sanitize(sheetName), boldFont, 14, usableWidth);
      current.drawText(title, { x: MARGIN, y: cursor.y - 14, size: 14, font: boldFont, color: rgb(0.13, 0.13, 0.13) });
      cursor.y -= 26;

      if (rows.length === 0 || columnCount === 0) {
        current.drawText('(this sheet is empty)', {
          x: MARGIN,
          y: cursor.y - FONT_SIZE,
          size: 10,
          font,
          color: rgb(0.45, 0.45, 0.45),
        });
        continue;
      }

      const drawRow = (row: string[], index: number) => {
        if (cursor.y - ROW_HEIGHT < MARGIN) {
          newPage();
        }
        const target = cursor.page;
        const isHeader = index === 0;
        const rowTop = cursor.y;
        const baseline = rowTop - ROW_HEIGHT + CELL_PADDING;

        if (isHeader) {
          target.drawRectangle({
            x: MARGIN,
            y: rowTop - ROW_HEIGHT,
            width: colWidths.reduce((sum, w) => sum + w, 0),
            height: ROW_HEIGHT,
            color: rgb(0.93, 0.93, 0.95),
          });
        } else if (index % 2 === 0) {
          target.drawRectangle({
            x: MARGIN,
            y: rowTop - ROW_HEIGHT,
            width: colWidths.reduce((sum, w) => sum + w, 0),
            height: ROW_HEIGHT,
            color: rgb(0.975, 0.975, 0.975),
          });
        }

        let x = MARGIN;
        for (let c = 0; c < colWidths.length; c++) {
          const cellFont = isHeader ? boldFont : font;
          const size = isHeader ? HEADER_FONT_SIZE : FONT_SIZE;
          const text = truncateToWidth(row[c] || '', cellFont, size, colWidths[c] - CELL_PADDING * 2);
          if (text) {
            target.drawText(text, {
              x: x + CELL_PADDING,
              y: baseline,
              size,
              font: cellFont,
              color: rgb(0.13, 0.13, 0.13),
            });
          }
          x += colWidths[c];
        }

        target.drawLine({
          start: { x: MARGIN, y: rowTop - ROW_HEIGHT },
          end: { x, y: rowTop - ROW_HEIGHT },
          thickness: 0.4,
          color: rgb(0.82, 0.82, 0.82),
        });

        cursor.y -= ROW_HEIGHT;
      };

      rows.forEach(drawRow);

      if (rawRows.length > MAX_ROWS_PER_SHEET) {
        if (cursor.y - ROW_HEIGHT < MARGIN) newPage();
        cursor.page.drawText(
          `... ${rawRows.length - MAX_ROWS_PER_SHEET} more rows not shown`,
          { x: MARGIN, y: cursor.y - ROW_HEIGHT + CELL_PADDING, size: FONT_SIZE, font, color: rgb(0.45, 0.45, 0.45) }
        );
        cursor.y -= ROW_HEIGHT;
      }
    }

    if (pdfDoc.getPageCount() === 0) {
      pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    }

    const bytes = await pdfDoc.save();
    const outName = `${file.name.replace(/\.[^/.]+$/, '') || 'spreadsheet'}.pdf`;

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Excel to PDF error:', error);
    return Response.json({ error: 'Failed to convert Excel to PDF' }, { status: 500 });
  }
}
