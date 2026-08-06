import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BILLING_PERIOD_DAYS } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(['ADMIN']);
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        plan: { select: { id: true, name: true, priceMonthly: true } },
      },
    });
    return NextResponse.json({ subscriptions });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const body = await request.json();
    const id = String(body.id ?? '');
    const action = String(body.action ?? '');
    if (!id || !['activate', 'cancel', 'extend'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({ where: { id } });
    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

    if (action === 'activate') {
      const base = sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > Date.now()
        ? sub.currentPeriodEnd.getTime()
        : Date.now();
      const updated = await prisma.subscription.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date(base + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({ subscription: updated });
    }

    if (action === 'cancel') {
      const updated = await prisma.subscription.update({
        where: { id },
        data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
      });
      return NextResponse.json({ subscription: updated });
    }

    // extend: push period end out by one billing period (no status change)
    const base = sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > Date.now()
      ? sub.currentPeriodEnd.getTime()
      : Date.now();
    const updated = await prisma.subscription.update({
      where: { id },
      data: { currentPeriodEnd: new Date(base + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000) },
    });
    return NextResponse.json({ subscription: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 400 });
  }
}
