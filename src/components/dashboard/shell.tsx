'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Wrench,
  Crown,
  BrainCircuit,
  Award,
  FileText,
  FileQuestion,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  Sparkles,
  Users,
  CreditCard,
  FileStack,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteBranding } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { Logo } from '@/components/layout/Logo';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type DashboardRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type DashboardUser = {
  name: string | null;
  email: string;
  image: string | null;
  role: DashboardRole;
  subscriptionActive: boolean;
};

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  premium?: boolean;
};

const commonNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Free Tools', href: '/tools', icon: Wrench },
  { name: 'Pricing', href: '/pricing', icon: Crown },
];

const premiumNav: NavItem[] = [
  { name: 'AI PDF Editor', href: '/ai-editor', icon: BrainCircuit, premium: true },
  { name: 'Exam Header Customizer', href: '/exam-header', icon: Award, premium: true },
  { name: 'OCR + Organize PDF', href: '/ocr-organize', icon: FileText, premium: true },
  { name: 'Question Bank', href: '/questions', icon: FileQuestion, premium: true },
  { name: 'Papers Bank', href: '/papers', icon: BookOpen, premium: true },
  { name: 'Exam Generator', href: '/exam-generator', icon: ClipboardList, premium: true },
  { name: 'Lesson Plans', href: '/lesson-plans', icon: GraduationCap, premium: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNav: NavItem[] = [
  { name: 'Admin Overview', href: '/dashboard/admin', icon: LayoutDashboard },
  { name: 'Site Settings', href: '/dashboard/admin/settings', icon: Settings },
  { name: 'Users', href: '/dashboard/admin/users', icon: Users },
  { name: 'Plans', href: '/dashboard/admin/plans', icon: CreditCard },
  { name: 'Subscriptions', href: '/dashboard/admin/subscriptions', icon: FileStack },
  { name: 'Content', href: '/dashboard/admin/content', icon: Trash2 },
];

function roleLabel(role: DashboardRole) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function NavLinks({
  items,
  premiumUnlocked,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  premiumUnlocked: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const locked = item.premium && !premiumUnlocked;

        if (locked) {
          return (
            <div
              key={item.name}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground/60 cursor-not-allowed"
              title="Upgrade to access this tool"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
              <Link
                href="/dashboard/subscription"
                onClick={onNavigate}
                className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
              >
                <Sparkles className="w-3 h-3" />
                Upgrade
              </Link>
            </div>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-red-500/20'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{item.name}</span>
            {item.premium && premiumUnlocked && (
              <Badge variant="success" className="ml-auto">
                Pro
              </Badge>
            )}
          </Link>
        );
      })}
    </>
  );
}

function SidebarContent({
  user,
  pathname,
  branding,
  onNavigate,
}: {
  user: DashboardUser;
  pathname: string;
  branding?: SiteBranding;
  onNavigate?: () => void;
}) {
  const premiumUnlocked = user.role === 'ADMIN' || (user.role === 'TEACHER' && user.subscriptionActive);

  const siteName = branding?.siteName || 'PDF Master';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 h-16 px-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          {branding?.siteLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.siteLogoUrl} alt={siteName} className="h-7 w-auto object-contain" />
          ) : (
            <Logo textClassName="text-xl" />
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLinks items={commonNav} premiumUnlocked={premiumUnlocked} pathname={pathname} onNavigate={onNavigate} />
        <div className="pt-4 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Premium Tools
        </div>
        <NavLinks items={premiumNav} premiumUnlocked={premiumUnlocked} pathname={pathname} onNavigate={onNavigate} />
        {user.role === 'ADMIN' && (
          <>
            <div className="pt-4 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </div>
            <NavLinks items={adminNav} premiumUnlocked pathname={pathname} onNavigate={onNavigate} />
          </>
        )}
      </nav>

      <div className="p-3 border-t text-xs text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{roleLabel(user.role)}</span>
      </div>
    </div>
  );
}

export function DashboardShell({
  user,
  branding,
  children,
}: {
  user: DashboardUser | null;
  branding?: SiteBranding;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const currentName =
    [...commonNav, ...premiumNav, ...adminNav].find(
      (n) => pathname === n.href || pathname.startsWith(n.href + '/')
    )?.name ?? 'Dashboard';

  async function handleSignOut() {
    try {
      await signOut({ redirectUrl: '/sign-in' });
    } catch {
      router.push('/sign-in');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border">
        <SidebarContent user={user as DashboardUser} pathname={pathname} branding={branding} />
      </aside>

      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                   <SidebarContent user={user as DashboardUser} pathname={pathname} branding={branding} onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-display font-semibold text-foreground">{currentName}</h1>
            </div>

            <div className="flex items-center gap-3">
              {user?.subscriptionActive && (
                <Badge variant="warning" className="hidden sm:flex">
                  <Crown className="w-3.5 h-3.5 mr-1" />
                  Premium
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-accent transition-colors">
                    <Avatar>
                      {user?.image && <AvatarImage src={user.image} alt={user.name ?? user.email} />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium leading-tight text-foreground truncate max-w-[140px]">
                        {user?.name ?? 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight truncate max-w-[140px]">
                        {user?.email}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="truncate">{user?.name ?? 'User'}</span>
                      <span className="text-xs font-normal text-muted-foreground truncate">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/subscription">
                      <Crown className="w-4 h-4" />
                      Subscription
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      handleSignOut();
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
