/**
 * `POST /api/subscription/manage` — self-service subscription management.
 *
 * Body: `{ action: 'cancel' | 'cancel_now' | 'resume' }`
 * - `cancel`     keep access until `currentPeriodEnd`, set `cancelAtPeriodEnd`
 * - `cancel_now` revoke immediately (status -> CANCELLED)
 * - `resume`     undo a pending cancellation
 *
 * Renewals are NOT automatic: the user pays again on the gateway and the
 * webhook extends `currentPeriodEnd`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cancelSubscription, getSubscriptionStatus, resumeSubscription } from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Action = 'cancel' | 'cancel_now' | 'resume';

const ACTIONS: readonly Action[] = ['cancel', 'cancel_now', 'resume'] as const;

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
    const raw = (body as { action?: unknown })?.action;
    const action = typeof raw === 'string' ? (raw.trim().toLowerCase() as Action) : 'cancel';

    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }

    const result =
      action === 'resume'
        ? await resumeSubscription(user.id)
        : await cancelSubscription(user.id, action === 'cancel');

    if (!result.ok) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      action,
      status: result.status,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
      subscription: await getSubscriptionStatus(user.id),
    });
  } catch (error) {
    console.error('Subscription manage error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
