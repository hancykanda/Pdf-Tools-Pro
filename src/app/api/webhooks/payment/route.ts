/**
 * `POST /api/webhooks/payment` — the ONLY way a subscription becomes ACTIVE.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HOW TO PLUG IN A GATEWAY
 * ────────────────────────────────────────────────────────────────────────────
 * 1. Set the shared secret in the env var of the gateway you use:
 *      SNIPPE_WEBHOOK_SECRET      (Snippe.me)
 *      MANUAL_WEBHOOK_SECRET      (admin / bank-transfer confirmations)
 *    Missing secret => rejected in production, skipped (with a warning) in dev.
 *
 * 2. Point the gateway dashboard at:
 *      https://<host>/api/webhooks/payment?gateway=snippe
 *    (or send the gateway name in the `x-gateway` header / `gateway` body
 *    field; `PAYMENT_GATEWAY` is the final fallback).
 *
 * 3. The signature is read from any of the headers listed in
 *    `SIGNATURE_HEADERS` below and verified as HMAC-SHA256 over the RAW body.
 *
 * 4. Field names are mapped per gateway in `GATEWAY_VERIFIERS` inside
 *    `@/lib/subscription` — adding a new gateway is one entry in that map
 *    (plus the value in the Prisma `Gateway` enum). Nothing else changes.
 *
 * The endpoint always answers `200 { received: true }`: gateways retry (and
 * often disable the endpoint) on non-2xx, and the `ok` flag in the body is
 * enough for debugging.
 */
import { NextRequest, NextResponse } from 'next/server';
import { applyWebhook } from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Headers the supported gateways use to carry their signature. */
const SIGNATURE_HEADERS = [
  'x-signature',
  'x-webhook-signature',
  'x-snippe-signature',
  'snippe-signature',
  'x-hub-signature-256',
];

function readSignature(request: NextRequest): string | undefined {
  for (const header of SIGNATURE_HEADERS) {
    const value = request.headers.get(header);
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

/** Snippe sends the timestamp used to build the signature in this header. */
function readTimestamp(request: NextRequest): string | undefined {
  return request.headers.get('x-webhook-timestamp')?.trim() || undefined;
}

function readGateway(request: NextRequest, rawBody: string): string {
  const fromHeader = request.headers.get('x-gateway');
  if (fromHeader?.trim()) return fromHeader.trim();

  const fromQuery = request.nextUrl.searchParams.get('gateway');
  if (fromQuery?.trim()) return fromQuery.trim();

  try {
    const parsed: unknown = JSON.parse(rawBody);
    const gateway = (parsed as { gateway?: unknown })?.gateway;
    if (typeof gateway === 'string' && gateway.trim()) return gateway.trim();
  } catch {
    /* not JSON — fall through to the env default */
  }

  return process.env.PAYMENT_GATEWAY ?? '';
}

export async function POST(request: NextRequest) {
  try {
    // RAW body — signatures are computed over the exact bytes sent.
    const rawBody = await request.text();
    const gateway = readGateway(request, rawBody);
    const signature = readSignature(request);
    const timestamp = readTimestamp(request);

    const result = await applyWebhook({ gateway, payload: rawBody, signature, timestamp });

    if (!result.ok) {
      console.warn(`[webhook] ${gateway || 'unknown gateway'}: payload rejected`);
    }

    return NextResponse.json({ received: true, ok: result.ok, status: result.status ?? null });
  } catch (error) {
    console.error('[webhook] payment webhook error:', error);
    // Still 2xx so the gateway does not disable the endpoint; we have the log.
    return NextResponse.json({ received: true, ok: false });
  }
}

/** Health check so gateway dashboards can validate the URL. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'payment-webhook' });
}
