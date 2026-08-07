import { NextRequest } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { makeTempDir } from '@/lib/cli';
import {
  errorResponse,
  findQpdf,
  getPdfFromPayload,
  inspectEncryption,
  isWrongPasswordError,
  looksLikePdf,
  pdfResponse,
  readToolRequest,
  runQpdf,
} from '@/lib/securityTools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Unlock PDF — removes password protection with `qpdf --decrypt`.
 *
 * The user must know the password: qpdf cannot (and this endpoint will not)
 * crack an unknown one.
 */
export async function POST(request: NextRequest) {
  let cleanup: (() => void) | null = null;

  try {
    if (!findQpdf()) {
      return errorResponse('qpdf is not available on the server', 503);
    }

    const payload = await readToolRequest(request);
    const bytes = getPdfFromPayload(payload, 'file');
    const password = String(payload.fields.password ?? '').trim();

    if (!bytes) return errorResponse('A PDF file is required');
    if (!looksLikePdf(bytes)) return errorResponse('The uploaded file is not a valid PDF');
    if (!password) return errorResponse('The current password is required to unlock this PDF');

    const temp = makeTempDir('pdftools-unlock-');
    cleanup = temp.cleanup;

    const inputPath = join(temp.dir, 'input.pdf');
    const outputPath = join(temp.dir, 'unlocked.pdf');
    writeFileSync(inputPath, Buffer.from(bytes));

    const info = await inspectEncryption(inputPath);
    if (!info.encrypted) {
      return errorResponse(
        'This PDF is not password protected — there is nothing to unlock.',
        400,
      );
    }

    let result = await runQpdf([
      '--decrypt',
      `--password=${password}`,
      inputPath,
      outputPath,
    ]);

    // Permission-only ("owner password") files open without a password. If the
    // supplied password does not match, still allow the restrictions to be
    // lifted rather than failing the user.
    if (!result.ok && !info.requiresPassword) {
      result = await runQpdf(['--decrypt', inputPath, outputPath]);
    }

    if (!result.ok) {
      if (isWrongPasswordError(result.stderr)) {
        return errorResponse('Incorrect password. Please check it and try again.', 400);
      }
      return errorResponse(
        result.stderr.trim().split('\n')[0] || 'Failed to unlock this PDF',
        422,
      );
    }

    if (!existsSync(outputPath)) {
      return errorResponse('qpdf did not produce an output file', 500);
    }

    const outBytes = new Uint8Array(readFileSync(outputPath));

    return pdfResponse(outBytes, 'unlocked.pdf', payload.wantsBinary, {
      requiredPassword: info.requiresPassword,
    });
  } catch (error) {
    console.error('Unlock error:', error);
    return errorResponse('Failed to unlock PDF. Incorrect password or corrupted file.', 500);
  } finally {
    cleanup?.();
  }
}
