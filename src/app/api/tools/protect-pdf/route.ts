import { NextRequest } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { makeTempDir } from '@/lib/cli';
import {
  errorResponse,
  findQpdf,
  getPdfFromPayload,
  inspectEncryption,
  looksLikePdf,
  pdfResponse,
  readToolRequest,
  runQpdf,
} from '@/lib/securityTools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (/^(true|1|yes|on|y)$/i.test(value)) return true;
    if (/^(false|0|no|off|n)$/i.test(value)) return false;
  }
  return fallback;
}

/**
 * Protect PDF — AES-256 password protection through `qpdf --encrypt`.
 *
 * Body: { file, password, confirmPassword?, ownerPassword?, allowPrinting?, allowCopying? }
 */
export async function POST(request: NextRequest) {
  let cleanup: (() => void) | null = null;

  try {
    if (!findQpdf()) {
      return errorResponse('qpdf is not available on the server', 503);
    }

    const payload = await readToolRequest(request);
    const bytes = getPdfFromPayload(payload, 'file');
    const password = String(payload.fields.password ?? '');
    const confirmValue = payload.fields.confirmPassword ?? payload.fields.passwordConfirm;
    const confirm = confirmValue === undefined ? null : String(confirmValue);
    const ownerPassword = String(payload.fields.ownerPassword ?? '') || password;

    const allowPrinting = asBoolean(payload.fields.allowPrinting, true);
    const allowCopying = asBoolean(payload.fields.allowCopying, false);

    if (!bytes) return errorResponse('A PDF file is required');
    if (!looksLikePdf(bytes)) return errorResponse('The uploaded file is not a valid PDF');
    if (!password) return errorResponse('A password is required');
    if (password.length < 4) {
      return errorResponse('Please use a password with at least 4 characters');
    }
    if (confirm !== null && confirm !== password) {
      return errorResponse('The passwords do not match');
    }

    const temp = makeTempDir('pdftools-protect-');
    cleanup = temp.cleanup;

    const inputPath = join(temp.dir, 'input.pdf');
    const outputPath = join(temp.dir, 'protected.pdf');
    writeFileSync(inputPath, Buffer.from(bytes));

    const info = await inspectEncryption(inputPath);
    if (info.requiresPassword) {
      return errorResponse(
        'This PDF is already password protected. Unlock it first, then protect it again.',
        400,
      );
    }

    // qpdf --encrypt <user-password> <owner-password> 256 [restrictions] -- in out
    const args = [
      '--encrypt',
      password,
      ownerPassword,
      '256',
      `--print=${allowPrinting ? 'full' : 'none'}`,
      `--extract=${allowCopying ? 'y' : 'n'}`,
      `--modify=${allowCopying ? 'all' : 'none'}`,
      '--accessibility=y',
      '--',
      inputPath,
      outputPath,
    ];

    const result = await runQpdf(args);
    if (!result.ok || !existsSync(outputPath)) {
      return errorResponse(
        result.stderr.trim().split('\n')[0] || 'Failed to protect this PDF',
        422,
      );
    }

    const outBytes = new Uint8Array(readFileSync(outputPath));

    return pdfResponse(outBytes, 'protected.pdf', payload.wantsBinary, {
      encryption: 'AES-256',
      allowPrinting,
      allowCopying,
    });
  } catch (error) {
    console.error('Protect error:', error);
    return errorResponse('Failed to protect PDF', 500);
  } finally {
    cleanup?.();
  }
}
