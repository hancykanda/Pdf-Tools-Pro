import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ROLES = ['ADMIN', 'TEACHER', 'STUDENT'] as const;
type Role = (typeof ROLES)[number];

export async function GET() {
  try {
    await requireRole(['ADMIN']);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: { where: { status: 'ACTIVE' }, select: { id: true } },
      },
    });

    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      subscriptionActive: u.role === 'ADMIN' ? true : u.subscriptions.length > 0,
    }));

    return NextResponse.json({ users: data });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireRole(['ADMIN']);

    const body = (await req.json()) as { userId?: string; role?: string };
    const { userId, role } = body;

    if (!userId || typeof role !== 'string' || !ROLES.includes(role as Role)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
    });

    return NextResponse.json({ user: { id: updated.id, role: updated.role } });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
