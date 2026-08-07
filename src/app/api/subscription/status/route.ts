/**
 * `GET /api/subscription/status` — the caller's subscription state.
 * Used by the dashboard/upgrade UI to poll after the user pays on the gateway
 * (the webhook is what actually flips PENDING -> ACTIVE).
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getActivePlan, getSubscriptionStatus, parsePlanFeatures } from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getSubscriptionStatus(user.id);
    const plan = status.active ? await getActivePlan(user.id) : null;

    return NextResponse.json({
      ...status,
      // ADMIN bypasses billing entirely (see `hasPremiumAccess` in @/lib/auth).
      premium: user.role === 'ADMIN' ? true : status.active,
      role: user.role,
      isTrial: status.isTrial,
      trialEndsAt: status.trialEndsAt,
      plan: plan ? { ...plan, featureList: parsePlanFeatures(plan) } : null,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ error: 'Failed to load subscription status' }, { status: 500 });
  }
}
