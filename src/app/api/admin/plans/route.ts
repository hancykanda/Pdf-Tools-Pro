import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(['ADMIN']);
    const plans = await prisma.plan.findMany({ orderBy: [{ priceMonthly: 'asc' }, { name: 'asc' }] });
    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const features = Array.isArray(body.features) ? body.features.filter((f: unknown) => typeof f === 'string') : [];
    const plan = await prisma.plan.create({
      data: {
        name,
        description: typeof body.description === 'string' ? body.description : null,
        priceMonthly: Number(body.priceMonthly) || 0,
        currency: typeof body.currency === 'string' && body.currency ? body.currency : 'TZS',
        features: JSON.stringify(features),
        active: body.active !== false,
      },
    });
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Plan create error:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const body = await request.json();
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Plan id is required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string') data.name = body.name.trim();
    if (typeof body.description === 'string' || body.description === null) data.description = body.description;
    if (typeof body.priceMonthly === 'number') data.priceMonthly = body.priceMonthly;
    if (typeof body.currency === 'string') data.currency = body.currency;
    if (typeof body.active === 'boolean') data.active = body.active;
    if (Array.isArray(body.features)) {
      data.features = JSON.stringify(body.features.filter((f: unknown) => typeof f === 'string'));
    }

    const plan = await prisma.plan.update({ where: { id }, data });
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Plan update error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const id = String(new URL(request.url).searchParams.get('id') ?? '');
    if (!id) return NextResponse.json({ error: 'Plan id is required' }, { status: 400 });
    await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Plan delete error:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 400 });
  }
}
