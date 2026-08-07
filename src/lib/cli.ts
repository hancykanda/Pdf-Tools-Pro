import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Run a command, returning stdout/stderr and exit code. Throws on spawn error. */
export function runCommand(
  bin: string,
  args: string[],
  opts: { cwd?: string; inputBuffer?: Buffer; timeoutMs?: number } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { cwd: opts.cwd });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    if (opts.inputBuffer) proc.stdin.end(opts.inputBuffer);
    const timer = opts.timeoutMs
      ? setTimeout(() => proc.kill('SIGKILL'), opts.timeoutMs)
      : null;
    proc.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

/** Create a unique temp working dir; returns path and a cleanup fn. */
export function makeTempDir(prefix = 'pdftools-'): {
  dir: string;
  cleanup: () => void;
} {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Locate a binary on PATH; returns null if missing. */
export function which(bin: string): string | null {
  try {
    return require('node:child_process')
      .execSync(`command -v ${bin}`, { encoding: 'utf8' })
      .trim();
  } catch {
    return null;
  }
}
