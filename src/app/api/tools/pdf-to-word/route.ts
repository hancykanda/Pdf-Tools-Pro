import { NextRequest } from 'next/server';
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Locate the LibreOffice binary (soffice preferred, libreoffice fallback). */
function findSoffice(): string | null {
  for (const candidate of ['soffice', 'libreoffice']) {
    try {
      const resolved = execSync(`command -v ${candidate}`, {
        encoding: 'utf8',
      }).trim();
      if (resolved) return resolved;
    } catch {
      // not on PATH, try next candidate
    }
  }
  return null;
}

/** Run `soffice --headless --convert-to docx` and return the produced .docx bytes. */
function convertPdfToDocx(pdfBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const soffice = findSoffice();
    if (!soffice) {
      reject(new Error('LibreOffice is not installed on the server.'));
      return;
    }

    const workDir = mkdtempSync(join(tmpdir(), 'pdftoword-'));
    const inputPath = join(workDir, 'input.pdf');
    const outputPath = join(workDir, 'input.docx');
    // A unique profile dir prevents "lock file" conflicts when several
    // conversions run at the same time on the same machine.
    const profileDir = join(workDir, 'profile');

    writeFileSync(inputPath, pdfBuffer);

    const args = [
      '--headless',
      '--norestore',
      '--nofirststartwizard',
      '--nologo',
      `-env:UserInstallation=file://${profileDir}`,
      // Import the PDF through the Writer filter so its text becomes real,
      // editable paragraphs instead of a Draw page (which can't export to
      // the Word text format).
      '--infilter=writer_pdf_import',
      '--convert-to',
      'docx:Office Open XML Text',
      '--outdir',
      workDir,
      inputPath,
    ];

    const proc = spawn(soffice, args);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err) => {
      cleanup(workDir);
      reject(err);
    });
    proc.on('close', (code) => {
      try {
        if (code !== 0 || !existsSync(outputPath)) {
          cleanup(workDir);
          reject(
            new Error(
              `LibreOffice conversion failed (exit ${code}). ${stderr.slice(0, 500)}`,
            ),
          );
          return;
        }
        const docx = readFileSync(outputPath);
        cleanup(workDir);
        resolve(docx);
      } catch (err) {
        cleanup(workDir);
        reject(err instanceof Error ? err : new Error('Failed to read converted file'));
      }
    });
  });
}

function cleanup(dir: string) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let pdfBuffer: Buffer | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (file) pdfBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await request.json();
      const pdfBase64: string | undefined = body.pdfBase64;
      if (pdfBase64) {
        const clean = pdfBase64.split(',')[1] || pdfBase64;
        pdfBuffer = Buffer.from(clean, 'base64');
      }
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const docx = await convertPdfToDocx(pdfBuffer);

    return new Response(new Uint8Array(docx), {
      status: 200,
      headers: {
        'Content-Type': DOCX_MIME,
        'Content-Disposition': 'attachment; filename="converted.docx"',
        'Content-Length': String(docx.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF to Word error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to convert PDF to Word';
    return Response.json({ error: message }, { status: 500 });
  }
}
