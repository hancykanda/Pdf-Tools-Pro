import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  GraduationCap,
  UserCheck,
  CreditCard,
  FileQuestion,
  BookOpen,
  ClipboardList,
  Award,
  Settings,
  Trash2,
  LayoutDashboard,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminNav } from '@/components/dashboard/AdminNav';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [totalUsers, teachers, students, activeSubs, questions, papers, lessonPlans, examHeaders, plans, revenueAgg] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.question.count(),
      prisma.paper.count(),
      prisma.lessonPlan.count(),
      prisma.examHeader.count(),
      prisma.plan.count(),
      prisma.subscription.findMany({ where: { status: 'ACTIVE' }, select: { plan: { select: { priceMonthly: true } } } }),
    ]);
  const monthlyRevenue = Math.round(revenueAgg.reduce((s, x) => s + (x.plan?.priceMonthly ?? 0), 0) * 100) / 100;

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, href: '/dashboard/admin/users' },
    { label: 'Teachers', value: teachers, icon: GraduationCap, href: '/dashboard/admin/users' },
    { label: 'Students', value: students, icon: UserCheck, href: '/dashboard/admin/users' },
    { label: 'Active Subscriptions', value: activeSubs, icon: CreditCard, href: '/dashboard/admin/subscriptions' },
    { label: 'Monthly Revenue', value: `$${monthlyRevenue}`, icon: CreditCard, href: '/dashboard/admin/subscriptions' },
    { label: 'Questions', value: questions, icon: FileQuestion, href: '/dashboard/admin/content' },
    { label: 'Papers', value: papers, icon: BookOpen, href: '/dashboard/admin/content' },
    { label: 'Lesson Plans', value: lessonPlans, icon: ClipboardList, href: '/dashboard/admin/content' },
    { label: 'Exam Headers', value: examHeaders, icon: Award, href: '/dashboard/admin/content' },
    { label: 'Plans', value: plans, icon: Settings, href: '/dashboard/admin/plans' },
  ];

  const managementLinks = [
    { label: 'Site Settings', desc: 'Name, logo, colors, payment gateways', icon: Settings, href: '/dashboard/admin/settings' },
    { label: 'Users', desc: 'View and change user roles', icon: Users, href: '/dashboard/admin/users' },
    { label: 'Plans', desc: 'Create and edit subscription plans', icon: CreditCard, href: '/dashboard/admin/plans' },
    { label: 'Subscriptions', desc: 'Activate, extend, or cancel', icon: ClipboardList, href: '/dashboard/admin/subscriptions' },
    { label: 'Content', desc: 'Moderate user-generated content', icon: Trash2, href: '/dashboard/admin/content' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-2">
          <LayoutDashboard className="w-7 h-7 text-primary" /> Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Full-system management and platform oversight.</p>
      </div>

      <AdminNav />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="font-display font-semibold text-xl text-foreground mb-3">Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managementLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <l.icon className="w-5 h-5 text-primary" /> {l.label}
                  </CardTitle>
                  <CardDescription>{l.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
