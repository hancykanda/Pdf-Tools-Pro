/**
 * Shared helpers for the Security submodel API routes
 * (unlock / protect / sign / redact / compare).
 *
 * Request handling accepts both shapes used across this codebase:
 *  - `application/json` with base64 (or data-URL) encoded files — the shape the
 *    existing tool pages use,
 *  - `multipart/form-data` with real file parts.
 *
 * Responses mirror the request: a JSON caller gets `{ dataUrl, filename }`
 * (backwards compatible), a multipart caller — or any caller sending
 * `Accept: application/pdf` — gets the raw PDF bytes.
 */

import { runCommand, which } from './cli';

export interface ToolRequestPayload {
  fields: Record<string, unknown>;
  files: Record<string, Uint8Array>;
  filenames: Record<string, string>;
  wantsBinary: boolean;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

export async function readToolRequest(request: Request): Promise<ToolRequestPayload> {
  const contentType = request.headers.get('content-type') ?? '';
  const accept = request.headers.get('accept') ?? '';
  const fields: Record<string, unknown> = {};
  const files: Record<string, Uint8Array> = {};
  const filenames: Record<string, string> = {};

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') {
        fields[key] = value;
      } else {
        files[key] = new Uint8Array(await value.arrayBuffer());
        filenames[key] = value.name;
      }
    }

    // Convention used across the tool pages: a single JSON `options` part.
    if (typeof fields.options === 'string') {
      try {
        const parsed = JSON.parse(fields.options);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (!(key in fields)) fields[key] = value;
          }
        }
      } catch {
        /* not JSON — leave the raw string in place */
      }
    }

    return {
      fields,
      files,
      filenames,
      wantsBinary: !accept.includes('application/json'),
    };
  }

  const body = (await request.json()) as Record<string, unknown>;
  return {
    fields: body ?? {},
    files,
    filenames,
    wantsBinary: accept.includes('application/pdf'),
  };
}

/** Decodes a base64 / data-URL string into bytes. Returns null when unusable. */
export function decodeBase64Pdf(value: unknown): Uint8Array | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const clean = value.includes(',') && value.startsWith('data:') ? value.split(',')[1] : value;
  try {
    const buffer = Buffer.from(clean, 'base64');
    if (buffer.length === 0) return null;
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

/** Pulls a PDF out of the payload by field name (multipart part or base64 field). */
export function getPdfFromPayload(payload: ToolRequestPayload, key = 'file'): Uint8Array | null {
  if (payload.files[key]) return payload.files[key];
  return decodeBase64Pdf(payload.fields[key]);
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  // Some producers emit leading whitespace/BOM before %PDF.
  const head = bytes.subarray(0, Math.min(bytes.length, 1024));
  for (let i = 0; i <= head.length - PDF_MAGIC.length; i++) {
    if (PDF_MAGIC.every((byte, offset) => head[i + offset] === byte)) return true;
  }
  return false;
}

export function toDataUrl(bytes: Uint8Array, mimeType = 'application/pdf'): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
}

/** Builds the response in the shape the caller asked for. */
export function pdfResponse(
  bytes: Uint8Array,
  filename: string,
  wantsBinary: boolean,
  extra: Record<string, unknown> = {},
): Response {
  if (wantsBinary) {
    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'no-store',
    });
    for (const [key, value] of Object.entries(extra)) {
      headers.set(`X-Tool-${key}`, String(value));
    }
    return new Response(Buffer.from(bytes) as unknown as BodyInit, { headers });
  }

  return Response.json({
    dataUrl: toDataUrl(bytes),
    filename,
    size: bytes.length,
    ...extra,
  });
}

export function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/* -------------------------------------------------------------------------- */
/* qpdf                                                                        */
/* -------------------------------------------------------------------------- */

let cachedQpdf: string | null | undefined;

/** Absolute path of the qpdf binary (cached), or null when it is unavailable. */
export function findQpdf(): string | null {
  if (cachedQpdf === undefined) cachedQpdf = which('qpdf');
  return cachedQpdf ?? null;
}

export interface QpdfResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Runs qpdf. Exit code 3 means "completed with warnings" and still produces a
 * valid output file, so it is treated as success.
 */
export async function runQpdf(args: string[], timeoutMs = 120_000): Promise<QpdfResult> {
  const bin = findQpdf();
  if (!bin) {
    return { ok: false, code: null, stdout: '', stderr: 'qpdf is not installed on the server' };
  }
  const result = await runCommand(bin, args, { timeoutMs });
  return {
    ok: result.code === 0 || result.code === 3,
    code: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export interface EncryptionInfo {
  encrypted: boolean;
  /** True when a password is required just to open the document. */
  requiresPassword: boolean;
}

/** Inspects a file with `qpdf --is-encrypted` / `--requires-password`. */
export async function inspectEncryption(path: string): Promise<EncryptionInfo> {
  // Exit codes: 0 = yes, 2 = no.
  const isEncrypted = await runQpdf(['--is-encrypted', path], 30_000);
  const requires = await runQpdf(['--requires-password', path], 30_000);
  return {
    encrypted: isEncrypted.code === 0,
    requiresPassword: requires.code === 0,
  };
}

export function isWrongPasswordError(stderr: string): boolean {
  return /invalid password|incorrect password|password is not/i.test(stderr);
}
