/**
 * `POST /api/subscription/clickpesa` — start a ClickPesa HOSTED checkout.
 *
 * ClickPesa auth is two-step: Client ID + API Key are exchanged for a short-lived
 * JWT (1h) via `POST /generate-token`; that token authorizes the checkout-link
 * call. We cache the token in memory and refresh before expiry.
 *
 * Creates a PENDING subscription (our `gatewayRef` becomes ClickPesa's
 * `orderReference`), then calls `POST /checkout-links` to get a `checkoutLink`
 * to embed in an <iframe>. When the customer pays, ClickPesa sends a checksum-
 * signed webhook to `POST /api/webhooks/payment?gateway=clickpesa` which flips
 * the row to ACTIVE.
 *
 * Requires the SNIPPE-style admin settings: Client ID (Public Key),
 * API Key (Secret Key), and Checksum Key (Webhook Secret).
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl, getGatewayApiKey, getGatewayClientId } from '@/lib/settings';
import {
  createSubscription,
  ensureDefaultPlan,
} from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLICKPESA_API_BASE = process.env.CLICKPESA_API_BASE ?? 'https://api.clickpesa.com/third-parties';
const CHECKOUT_LINK_PATH = process.env.CLICKPESA_CHECKOUT_PATH ?? '/checkout-links';
const MIN_AMOUNT = 500; // ClickPesa minimum for mobile-money collection.

// In-memory JWT cache (token valid 60 min; refresh 30s early).
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getClickpesaToken(clientId: string, apiKey: string): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) return tokenCache.token;

  const res = await fetch(`${CLICKPESA_API_BASE}/generate-token`, {
    method: 'POST',
    headers: { 'client-id': clientId, 'api-key': apiKey, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ClickPesa token request failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error('ClickPesa token missing in response');
  tokenCache = { token: data.token, expiresAt: now + 60 * 60 * 1000 };
  return data.token;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = (await getGatewayClientId('CLICKPESA')).trim();
    const apiKey = (await getGatewayApiKey('CLICKPESA')).trim();
    if (!clientId || !apiKey) {
      return NextResponse.json(
        { error: 'ClickPesa gateway is not configured (set Client ID + API Key in Payment Gateway settings)' },
        { status: 501 },
      );
    }

    let body: { planId?: unknown } = {};
    try {
      body = (await request.json()) as { planId?: unknown };
    } catch {
      body = {};
    }
    const requestedPlanId = typeof body.planId === 'string' ? body.planId : '';

    let plan = requestedPlanId ? await prisma.plan.findUnique({ where: { id: requestedPlanId } }) : null;
    if (!plan) {
      const anyPlan = await prisma.plan.count();
      if (requestedPlanId && anyPlan > 0) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
      }
      plan = await prisma.plan.findUnique({ where: { id: await ensureDefaultPlan() } });
    }
    if (!plan || !plan.active) {
      return NextResponse.json({ error: 'Plan is not active' }, { status: 400 });
    }

    // ClickPesa's `orderReference` must be alphanumeric (no underscores), so we
    // mint a ClickPesa-safe reference and store it as the subscription ref.
    const gatewayRef = `cp${randomBytes(11).toString('hex')}`;
    const { id } = await createSubscription({
      userId: user.id,
      planId: plan.id,
      gateway: 'CLICKPESA',
      gatewayRef,
    });

    const amount = Math.max(MIN_AMOUNT, Math.round(plan.priceMonthly));
    const origin = (await getAppUrl()) || request.nextUrl.origin;
    const webhookUrl = `${origin}/api/webhooks/payment?gateway=clickpesa`;

    const token = await getClickpesaToken(clientId, apiKey);

    const res = await fetch(`${CLICKPESA_API_BASE}${CHECKOUT_LINK_PATH}`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderReference: gatewayRef,
        orderCurrency: plan.currency || 'TZS',
        orderItems: [{ name: plan.name, price: String(amount), quantity: 1 }],
        customerName: user.name,
        customerEmail: user.email,
        description: `PDF Master — ${plan.name}`,
        callbackUrl: webhookUrl,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[clickpesa] checkout link failed', res.status, detail);
      return NextResponse.json(
        { error: 'Failed to create ClickPesa checkout link', detail },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { checkoutLink?: string };
    const checkoutUrl = data.checkoutLink ?? null;
    if (!checkoutUrl) {
      console.error('[clickpesa] response missing checkoutLink', data);
      return NextResponse.json({ error: 'ClickPesa response missing checkoutLink' }, { status: 502 });
    }

    return NextResponse.json(
      {
        subscriptionId: id,
        gatewayRef,
        checkoutUrl,
        status: 'PENDING',
        instructions: 'Complete the payment in the widget below using mobile money or card.',
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start ClickPesa checkout';
    const isClientError = /plan|gateway|user/i.test(message);
    console.error('[clickpesa] subscription error:', error);
    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 500 });
  }
}
