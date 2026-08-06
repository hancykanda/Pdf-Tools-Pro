/**
 * `POST /api/subscription/snippe` — start an AUTOMATIC Snippe checkout.
 *
 * Creates a PENDING subscription row (so the webhook can later flip it to
 * ACTIVE) and a Snippe Payment Session. The returned `checkoutUrl` is the
 * Snippe hosted checkout page — render it in an <iframe> as the embedded
 * widget. When the customer pays (mobile money USSD), Snippe calls
 * `POST /api/webhooks/payment?gateway=snippe`, which activates the row.
 *
 * Requires `SNIPPE_API_KEY`. The webhook signing secret (`SNIPPE_WEBHOOK_SECRET`)
 * is configured in Snippe's dashboard to point at the webhook URL above.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppUrl, getGatewayApiKey } from '@/lib/settings';
import {
  createGatewayRef,
  createSubscription,
  ensureDefaultPlan,
} from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SNIPPE_API_BASE = process.env.SNIPPE_API_BASE ?? 'https://api.snippe.sh';
const MIN_SNIPPE_AMOUNT = 500; // Snippe requires mobile-money amounts >= 500.

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = (await getGatewayApiKey('SNIPPE')).trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Snippe gateway is not configured (set the SNIPPE Secret Key in Payment Gateway settings)' },
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

    // Resolve the plan (mirrors createSubscription's fallback so an un-seeded
    // DB still works).
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

    // Create the PENDING subscription intent and use its reference as the
    // stable key Snippe echoes back via webhook metadata + idempotency.
    const gatewayRef = createGatewayRef();
    const { id } = await createSubscription({
      userId: user.id,
      planId: plan.id,
      gateway: 'SNIPPE',
      gatewayRef,
    });

    // Snippe expects an integer amount in the currency's main unit.
    const amount = Math.max(MIN_SNIPPE_AMOUNT, Math.round(plan.priceMonthly));

    const origin = (await getAppUrl()) || request.nextUrl.origin;
    const webhookUrl = `${origin}/api/webhooks/payment?gateway=snippe`;
    const redirectUrl = `${origin}/dashboard/subscription`;

    const sessionRes = await fetch(`${SNIPPE_API_BASE}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': gatewayRef,
      },
      body: JSON.stringify({
        amount,
        currency: plan.currency || 'TZS',
        allowed_methods: ['mobile_money'],
        customer: { name: user.name, email: user.email },
        description: `PDF Master — ${plan.name}`,
        metadata: { gatewayRef, userId: user.id, planId: plan.id },
        webhook_url: webhookUrl,
        redirect_url: redirectUrl,
        expires_in: 3600,
      }),
    });

    if (!sessionRes.ok) {
      const detail = await sessionRes.text();
      console.error('[snippe] session create failed', sessionRes.status, detail);
      return NextResponse.json(
        { error: 'Failed to create Snippe checkout session', detail },
        { status: 502 },
      );
    }

    const session = (await sessionRes.json()) as {
      data?: { checkout_url?: string; reference?: string };
      checkout_url?: string;
      reference?: string;
    };
    const checkoutUrl = session.data?.checkout_url ?? session.checkout_url ?? null;
    const sessionReference = session.data?.reference ?? session.reference ?? null;

    if (!checkoutUrl) {
      console.error('[snippe] session response missing checkout_url', session);
      return NextResponse.json({ error: 'Snippe session missing checkout URL' }, { status: 502 });
    }

    return NextResponse.json(
      {
        subscriptionId: id,
        gatewayRef,
        sessionReference,
        checkoutUrl,
        status: 'PENDING',
        instructions: 'Complete the payment in the widget below using mobile money.',
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Snippe checkout';
    const isClientError = /plan|gateway|user/i.test(message);
    console.error('[snippe] subscription error:', error);
    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 500 });
  }
}
