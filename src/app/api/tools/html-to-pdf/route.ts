import { NextRequest } from 'next/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import puppeteer, { type Browser, type PDFOptions, type PaperFormat } from 'puppeteer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SUPPORTED_FORMATS: Record<string, PaperFormat> = {
  a3: 'a3',
  a4: 'a4',
  a5: 'a5',
  letter: 'letter',
  legal: 'legal',
  tabloid: 'tabloid',
};

const MARGIN_PRESETS: Record<string, PDFOptions['margin']> = {
  none: { top: '0', right: '0', bottom: '0', left: '0' },
  small: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
  default: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  large: { top: '30mm', right: '25mm', bottom: '30mm', left: '25mm' },
};

/** Chromium refuses to start as root without --no-sandbox (crbug.com/638180). */
const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--hide-scrollbars',
  '--mute-audio',
];

const NAVIGATION_TIMEOUT_MS = 45_000;

class HtmlToPdfError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'HtmlToPdfError';
    this.status = status;
  }
}

/** Reject anything that is not a public http(s) address (basic SSRF guard). */
async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new HtmlToPdfError('Please enter a valid URL, including http:// or https://');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HtmlToPdfError('Only http:// and https:// URLs can be converted.');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];

  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      const resolved = await lookup(host, { all: true });
      addresses = resolved.map((entry) => entry.address);
    } catch {
      throw new HtmlToPdfError(`Could not resolve "${url.hostname}". Check the address and try again.`);
    }
  }

  if (addresses.some(isPrivateAddress)) {
    throw new HtmlToPdfError('That address is not reachable from this service.', 403);
  }

  return url;
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const v6 = address.toLowerCase();
    if (v6 === '::1' || v6 === '::') return true;
    if (v6.startsWith('fc') || v6.startsWith('fd')) return true; // unique local
    if (v6.startsWith('fe80')) return true; // link local
    // IPv4-mapped (::ffff:127.0.0.1)
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

interface ConversionInput {
  mode: 'url' | 'html';
  url?: string;
  html?: string;
  format: PaperFormat;
  margin: PDFOptions['margin'];
  landscape: boolean;
  printBackground: boolean;
  scale: number;
  filename: string;
}

function readOptions(get: (key: string) => string | undefined) {
  const sizeKey = (get('pageSize') || get('format') || 'a4').toLowerCase();
  const marginKey = (get('margin') || 'default').toLowerCase();
  const orientation = (get('orientation') || 'portrait').toLowerCase();
  const background = get('printBackground');
  const rawScale = Number(get('scale'));

  return {
    format: SUPPORTED_FORMATS[sizeKey] ?? 'a4',
    margin: MARGIN_PRESETS[marginKey] ?? MARGIN_PRESETS.default,
    landscape: orientation === 'landscape',
    printBackground: background === undefined ? true : background !== 'false',
    scale: Number.isFinite(rawScale) && rawScale >= 0.1 && rawScale <= 2 ? rawScale : 1,
  };
}

async function parseRequest(request: NextRequest): Promise<ConversionInput> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const get = (key: string) => {
      const value = formData.get(key);
      return typeof value === 'string' ? value : undefined;
    };
    const options = readOptions(get);
    const entry = formData.get('file');
    const file = entry instanceof File && entry.size > 0 ? entry : null;
    const url = get('url');
    const inlineHtml = get('html');
    const mode = (get('mode') || (url && !file ? 'url' : 'html')) as 'url' | 'html';

    if (mode === 'url') {
      if (!url) throw new HtmlToPdfError('A URL is required');
      return { mode, url, ...options, filename: 'webpage' };
    }

    const html = file ? await file.text() : inlineHtml;
    if (!html || !html.trim()) {
      throw new HtmlToPdfError('Upload an HTML file or paste HTML content');
    }
    return {
      mode: 'html',
      html,
      ...options,
      filename: file ? file.name.replace(/\.[^/.]+$/, '') || 'document' : 'document',
    };
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new HtmlToPdfError('Invalid request body');

  const get = (key: string) => {
    const value = body[key];
    if (value === undefined || value === null) return undefined;
    return String(value);
  };
  const options = readOptions(get);
  const url = get('url');
  const html = get('html');
  const mode = (get('mode') || (url && !html ? 'url' : 'html')) as 'url' | 'html';

  if (mode === 'url') {
    if (!url) throw new HtmlToPdfError('A URL is required');
    return { mode, url, ...options, filename: 'webpage' };
  }

  if (!html || !html.trim()) {
    throw new HtmlToPdfError('HTML content is required');
  }
  return { mode: 'html', html, ...options, filename: 'document' };
}

/** Launch headless Chromium and render the input to PDF bytes. */
async function renderPdf(input: ConversionInput): Promise<Buffer> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: LAUNCH_ARGS,
      // Honour a system Chromium when the bundled download is unavailable.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    if (input.mode === 'url') {
      const url = await assertPublicUrl(input.url!);
      const response = await page.goto(url.toString(), {
        waitUntil: 'networkidle2',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      if (!response) {
        throw new HtmlToPdfError('The page could not be loaded.', 502);
      }
      if (!response.ok() && response.status() >= 400) {
        throw new HtmlToPdfError(
          `The page returned HTTP ${response.status()}. Check the URL and try again.`,
          502,
        );
      }
    } else {
      // `setContent` only supports load/domcontentloaded in Puppeteer 25.
      await page.setContent(input.html!, {
        waitUntil: 'load',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      // Give late-loading images/fonts referenced by absolute URLs a moment.
      await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    }

    // Use screen styles so pages without a print stylesheet look right.
    await page.emulateMediaType('screen');

    const pdf = await page.pdf({
      format: input.format,
      margin: input.margin,
      landscape: input.landscape,
      printBackground: input.printBackground,
      scale: input.scale,
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        /* best effort */
      });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseRequest(request);
    const pdf = await renderPdf(input);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${input.filename.replace(/[\r\n"\\]/g, '')}.pdf"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof HtmlToPdfError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error('HTML to PDF error:', error);
    const message = error instanceof Error ? error.message : '';

    if (/Failed to launch|Could not find (Chrome|browser)|ENOENT/i.test(message)) {
      return Response.json(
        { error: 'The PDF renderer (headless Chromium) is unavailable on this server.' },
        { status: 503 },
      );
    }
    if (/timeout|Navigation timeout/i.test(message)) {
      return Response.json(
        { error: 'The page took too long to load. Try a simpler page or paste the HTML directly.' },
        { status: 504 },
      );
    }
    if (/net::ERR_/i.test(message)) {
      return Response.json(
        { error: 'The page could not be reached. Check the URL and try again.' },
        { status: 502 },
      );
    }

    return Response.json({ error: 'Failed to convert HTML to PDF' }, { status: 500 });
  }
}
