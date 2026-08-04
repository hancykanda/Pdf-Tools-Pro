import { NextRequest } from 'next/server';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return Response.json({ error: 'Please upload a valid PDF file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text || 'No text could be extracted from this PDF.';

    const lines = text.split('\n').filter((line: string) => line.trim() !== '');
    const rows = lines.map((line: string) => line.split(/\s{2,}|\t/).filter((cell: string) => cell.trim() !== ''));

    const worksheet = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['No data extracted']]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, '')}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('PDF to Excel error:', error);
    return Response.json({ error: 'Failed to convert PDF to Excel' }, { status: 500 });
  }
}
