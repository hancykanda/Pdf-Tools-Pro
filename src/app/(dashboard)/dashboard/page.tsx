import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  GraduationCap,
  Crown,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Wrench,
  ShieldCheck,
  Users,
  CreditCard,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const freeTools = [
  { name: 'Merge PDF', href: '/tools/merge', icon: FileText },
  { name: 'Compress PDF', href: '/tools/compress', icon: FileText },
  { name: 'PDF to Word', href: '/tools/pdf-to-word', icon: FileText },
  { name: 'Split PDF', href: '/tools/split', icon: FileText },
  { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', icon: FileText },
  { name: 'Organize PDF', href: '/tools/organize-pdf', icon: FileText },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (user.role === 'STUDENT') {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center text-center py-16">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
              <GraduationCap className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Your student dashboard is coming soon</CardTitle>
            <CardDescription className="mt-2 max-w-md">
              We&apos;re building a dedicated space for students. In the meantime, explore our free
              PDF tools below.
            </CardDescription>
            <Button asChild className="mt-6">
              <Link href="/tools">
                <Wrench className="w-4 h-4" />
                Browse free tools
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === 'ADMIN') {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and platform-wide settings.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Management</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View, search, and change user roles across the platform.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/admin">
                  Open <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Oversight</CardTitle>
              <CreditCard className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Teachers subscribe via SNIPPE / Flutterwave gateways.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/subscription">
                  Manage <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Status</CardTitle>
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant="success">Healthy</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                You have full administrative access.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // TEACHER
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">
          Welcome back, {user.name || 'Teacher'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Your AI-powered teacher workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your premium plan status</CardDescription>
          </CardHeader>
          <CardContent>
            {user.subscriptionActive ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-700">Active</p>
                  <p className="text-sm text-muted-foreground">
                    All premium teacher tools are unlocked.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700">No active plan</p>
                  <p className="text-sm text-muted-foreground">
                    Subscribe to unlock AI PDF Editor, Exam Generator and more.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {user.subscriptionActive ? (
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/subscription">
                  <CreditCard className="w-4 h-4" />
                  Manage subscription
                </Link>
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/dashboard/subscription">
                  <Sparkles className="w-4 h-4" />
                  Subscribe now
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Premium Tools</CardTitle>
            <CardDescription>AI-powered teacher workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              'AI PDF Editor',
              'Exam Generator',
              'Question Bank',
              'Lesson Plans',
              'Exam Header Customizer',
              'OCR + Organize',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm">
                <Sparkles className={user.subscriptionActive ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-amber-500'} />
                <span className={user.subscriptionActive ? '' : 'text-muted-foreground'}>{t}</span>
                {!user.subscriptionActive && <Badge variant="warning" className="ml-auto">Locked</Badge>}
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Badge variant="outline" className="font-normal">
              {user.subscriptionActive ? 'Unlocked' : 'Requires subscription'}
            </Badge>
          </CardFooter>
        </Card>
      </div>

      <div>
        <h2 className="font-display font-semibold text-xl text-foreground mb-3">Free tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {freeTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex items-center gap-3 bg-white p-4 rounded-xl border border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <tool.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{tool.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
