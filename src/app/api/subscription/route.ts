/**
 * `GET  /api/subscription` — plans available + the caller's current status.
 * `POST /api/subscription` — create a PENDING subscription ("intent to pay").
 *
 * There is NO payment SDK here: the response hands back a `gatewayRef` that
 * the user quotes when paying on the local gateway (Snippe.me / Flutterwave).
 * The gateway's webhook (`/api/webhooks/payment`) flips the row to ACTIVE.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  createGatewayRef,
  createSubscription,
  getSubscriptionStatus,
  listPlans,
  normalizeGateway,
  parsePlanFeatures,
} from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [plans, subscription] = await Promise.all([
      listPlans(),
      getSubscriptionStatus(user.id),
    ]);

    return NextResponse.json({
      // `features` stays the raw JSON string (Plan shape); `featureList` is the
      // parsed convenience version for the UI.
      plans: plans.map((plan) => ({ ...plan, featureList: parsePlanFeatures(plan) })),
      subscription,
    });
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { planId, gateway } = (body ?? {}) as { planId?: unknown; gateway?: unknown };

    const gatewayName = normalizeGateway(
      typeof gateway === 'string' && gateway.trim()
        ? gateway
        : process.env.PAYMENT_GATEWAY || 'MANUAL',
    );
    if (!gatewayName) {
      return NextResponse.json({ error: 'Unsupported payment gateway' }, { status: 400 });
    }

    const gatewayRef = createGatewayRef();

    const { id } = await createSubscription({
      userId: user.id,
      planId: typeof planId === 'string' ? planId : '',
      gateway: gatewayName,
      gatewayRef,
    });

    return NextResponse.json(
      {
        subscriptionId: id,
        gatewayRef,
        gateway: gatewayName,
        status: 'PENDING',
        instructions: 'Complete payment via the gateway using this reference',
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create subscription';
    const isClientError = /plan|gateway|user/i.test(message);
    console.error('Subscription POST error:', error);
    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 500 });
  }
}
