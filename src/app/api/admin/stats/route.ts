import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(['ADMIN']);

    const [
      totalUsers,
      admins,
      teachers,
      students,
      activeSubs,
      questions,
      papers,
      lessonPlans,
      examHeaders,
      plans,
      revenueAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.question.count(),
      prisma.paper.count(),
      prisma.lessonPlan.count(),
      prisma.examHeader.count(),
      prisma.plan.count(),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { plan: { select: { priceMonthly: true } } },
      }),
    ]);

    const monthlyRevenue = revenueAgg.reduce((sum, s) => sum + (s.plan?.priceMonthly ?? 0), 0);

    return NextResponse.json({
      totalUsers,
      roles: { ADMIN: admins, TEACHER: teachers, STUDENT: students },
      activeSubscriptions: activeSubs,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      content: {
        questions,
        papers,
        lessonPlans,
        examHeaders,
      },
      plans,
    });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
