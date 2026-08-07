/**
 * `POST /api/subscription/trial` — starts a free trial for the caller.
 *
 * Eligibility (teacher-only, trials enabled, no existing active/trial sub) is
 * enforced in `startFreeTrial()` in `@/lib/subscription`. The trial is a
 * `TRIALING` subscription that counts as premium via `getSubscriptionStatus`.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { startFreeTrial } from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await startFreeTrial(user.id);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start free trial';
    const isClientError = /trial|teacher|enabled|subscription/i.test(message);
    console.error('Start trial error:', error);
    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 500 });
  }
}
