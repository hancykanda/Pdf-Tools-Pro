import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, password } = body;

    if (!file || !password) {
      return Response.json({ error: 'File and password are required' }, { status: 400 });
    }

    const cleanBase64 = file.split(',')[1] || file;
    const inputBuffer = Buffer.from(cleanBase64, 'base64');

    const inputPath = join(tmpdir(), `input-${Date.now()}.pdf`);
    const outputPath = join(tmpdir(), `output-${Date.now()}.pdf`);

    writeFileSync(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      const qpdf = spawn('qpdf', ['--encrypt', password, password, '256', '--', inputPath, outputPath]);
      qpdf.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`qpdf exited with code ${code}`))));
      qpdf.on('error', reject);
    });

    const outBuffer = readFileSync(outputPath);
    const dataUrl = `data:application/pdf;base64,${outBuffer.toString('base64')}`;

    unlinkSync(inputPath);
    unlinkSync(outputPath);

    return Response.json({ dataUrl, filename: 'protected.pdf' });
  } catch (error) {
    console.error('Protect error:', error);
    return Response.json({ error: 'Failed to protect PDF' }, { status: 500 });
  }
}
