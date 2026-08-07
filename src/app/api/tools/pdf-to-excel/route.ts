import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { extractTables, parsePageRange } from '@/lib/pdfTable';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function POST(request: NextRequest) {
  let file: File | null = null;
  let pageRange = '';
  let tablesOnly = true;

  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
    pageRange = String(formData.get('pages') || formData.get('pageRange') || '').trim();
    tablesOnly = String(formData.get('tablesOnly') ?? 'true') !== 'false';
  } catch {
    return Response.json(
      { error: 'Invalid form data. Upload the PDF as multipart/form-data.' },
      { status: 400 },
    );
  }

  if (!file || file.size === 0) {
    return Response.json({ error: 'PDF file is required' }, { status: 400 });
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'Please upload a valid PDF file' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return Response.json({ error: 'Please upload a valid PDF file' }, { status: 400 });
    }

    // Peek at the page count so "3-7" style ranges can be clamped.
    const probe = await extractTables(buffer, { pages: [1], tablesOnly });
    const pages = parsePageRange(pageRange, probe.pageCount);

    if (pageRange && pages.length === 0) {
      return Response.json(
        { error: `Invalid page range. This PDF has ${probe.pageCount} page(s).` },
        { status: 400 },
      );
    }

    const { tables } = await extractTables(buffer, { pages, tablesOnly });

    if (tables.length === 0) {
      return Response.json(
        {
          error:
            'No extractable text or tables were found on the selected pages. Scanned PDFs need OCR first.',
        },
        { status: 422 },
      );
    }

    const workbook = XLSX.utils.book_new();
    for (const table of tables) {
      const rows = table.rows.length ? table.rows : [['(no rows detected)']];
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      const widths = rows.reduce<number>((max, row) => Math.max(max, row.length), 0);
      sheet['!cols'] = Array.from({ length: widths }, () => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(workbook, sheet, `Page ${table.page}`.slice(0, 31));
    }

    const out: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const base = (file.name.replace(/\.[^/.]+$/, '') || 'converted').replace(/[\r\n"\\/]+/g, '');
    const pagesWithTables = tables.filter((t) => t.hasTable).map((t) => t.page);

    return new Response(new Uint8Array(out), {
      status: 200,
      headers: {
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="${base}.xlsx"`,
        'Content-Length': String(out.length),
        'X-Sheet-Count': String(tables.length),
        'X-Table-Pages': pagesWithTables.join(',') || 'none',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF to Excel error:', error);
    return Response.json({ error: 'Failed to convert PDF to Excel' }, { status: 500 });
  }
}
