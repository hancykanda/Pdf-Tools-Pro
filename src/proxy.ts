/**
 * Next.js 16 Proxy (formerly `middleware.ts`) — must live at `src/proxy.ts`,
 * i.e. the same level as `src/app`. Runs on the Node.js runtime by default in
 * Next 16, so Prisma is usable here.
 *
 * Auth/roles: Clerk. Subscriptions: our own DB (`@/lib/subscription`).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getSubscriptionStatus } from '@/lib/subscription';
import type { UserRole } from '@prisma/client';

/** Premium teacher-workspace pages (require ADMIN, or TEACHER + active sub). */
const PREMIUM_PAGES = [
  '/ai-editor',
  '/exam-header',
  '/ocr-organize',
  '/questions',
  '/papers',
  '/exam-generator',
  '/lesson-plans',
  '/settings',
];

/** Any authenticated role may reach the dashboard shell. */
const DASHBOARD_PAGES = ['/dashboard'];

/** Free PDF tools — signed-in staff only (ADMIN | TEACHER). */
const FREE_TOOL_PAGES = ['/tools'];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPremiumApi(pathname: string): boolean {
  return pathname === '/api/premium' || pathname.startsWith('/api/premium/');
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

/** ADMIN always; TEACHER only with an active subscription in our DB. */
async function canUsePremium(userId: string, role: UserRole): Promise<boolean> {
  if (role === 'ADMIN') return true;
  if (role !== 'TEACHER') return false;
  const { active } = await getSubscriptionStatus(userId);
  return active;
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const premiumApi = isPremiumApi(pathname);

  const { userId } = await auth();

  // 1. Unauthenticated -> 401 for APIs, sign-in redirect for pages.
  if (!userId) {
    if (premiumApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return redirectTo(request, '/sign-in');
  }

  let u: { id: string; role: UserRole } | null = null;
  try {
    u = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    });
  } catch (err) {
    // DB unreachable: fail closed for protected areas; allow the dashboard
    // shell through (its pages re-check auth/subscription themselves).
    console.error('[proxy] failed to load user from DB:', err);
    if (premiumApi) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    if (matches(pathname, FREE_TOOL_PAGES) || matches(pathname, PREMIUM_PAGES)) {
      return redirectTo(request, '/dashboard');
    }
    return NextResponse.next();
  }

  // 2. Signed in with Clerk but no Prisma row yet: `getCurrentUser()` creates
  //    it lazily. Let API + dashboard requests through, park everything else
  //    on /dashboard until the row exists.
  if (!u) {
    if (premiumApi || matches(pathname, DASHBOARD_PAGES)) {
      return NextResponse.next();
    }
    return redirectTo(request, '/dashboard');
  }

  // 3. Dashboard: ADMIN | TEACHER | STUDENT — pages render role-specific content.
  if (matches(pathname, DASHBOARD_PAGES)) {
    return NextResponse.next();
  }

  // 4. Free tools: staff only.
  if (matches(pathname, FREE_TOOL_PAGES)) {
    if (u.role === 'ADMIN' || u.role === 'TEACHER') {
      return NextResponse.next();
    }
    return redirectTo(request, '/dashboard');
  }

  // 5. Premium pages + /api/premium/*: ADMIN, or TEACHER with active sub.
  if (premiumApi || matches(pathname, PREMIUM_PAGES)) {
    if (await canUsePremium(u.id, u.role)) {
      return NextResponse.next();
    }
    if (premiumApi) {
      return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
    }
    return redirectTo(request, '/dashboard');
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/api/premium/:path*',
    '/dashboard/:path*',
    '/ai-editor/:path*',
    '/exam-header/:path*',
    '/ocr-organize/:path*',
    '/questions/:path*',
    '/papers/:path*',
    '/exam-generator/:path*',
    '/lesson-plans/:path*',
    '/settings/:path*',
    '/tools/:path*',
  ],
};
