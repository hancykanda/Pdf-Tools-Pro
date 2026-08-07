import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SIDECAR_URL = process.env.PYTHON_SIDECAR_URL || 'http://localhost:8001';

/**
 * Premium tool: Remove Watermark / Logo.
 *
 * Gated through `hasPremiumAccess` (ADMIN, or TEACHER with an active
 * subscription) — same rule as the other premium routes. Forwards the upload
 * to the Python OpenCV sidecar and streams the cleaned file back.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPremiumAccess(user)) {
      return NextResponse.json(
        { error: 'Premium subscription required to use Remove Watermark.' },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'A PDF or image file is required' }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append('file', file, file.name || 'document');

    const template = formData.get('template');
    if (template instanceof File && template.size > 0) {
      upstream.append('template', template, template.name || 'template');
    }

    const box = formData.get('box');
    if (typeof box === 'string' && box.trim()) upstream.append('box', box);

    const applyToAll = formData.get('applyToAll');
    if (typeof applyToAll === 'string') upstream.append('applyToAll', applyToAll);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(`${SIDECAR_URL}/remove-watermark`, {
        method: 'POST',
        body: upstream,
        // Don't let the sidecar hold the request indefinitely.
        signal: AbortSignal.timeout(290_000),
      });
    } catch {
      return NextResponse.json(
        { error: 'The watermark removal service is unavailable. Please try again later.' },
        { status: 503 },
      );
    }

    if (!upstreamRes.ok) {
      const detail = await upstreamRes.text().catch(() => '');
      let message = 'Watermark removal failed.';
      if (detail) {
        try {
          const parsed = JSON.parse(detail);
          if (parsed?.detail) message = parsed.detail;
        } catch {
          message = detail.slice(0, 300);
        }
      }
      const status = upstreamRes.status >= 500 ? 502 : upstreamRes.status;
      return NextResponse.json({ error: message }, { status });
    }

    const buffer = Buffer.from(await upstreamRes.arrayBuffer());
    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const disposition =
      upstreamRes.headers.get('content-disposition') || 'attachment; filename="cleaned.pdf"';

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Remove watermark error:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove watermark';
    if (/timeout/i.test(message)) {
      return NextResponse.json({ error: 'Watermark removal took too long.' }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
