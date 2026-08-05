import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const premiumPages = [
  '/dashboard',
  '/ai-editor',
  '/exam-header',
  '/ocr-organize',
  '/questions',
  '/papers',
  '/exam-generator',
  '/lesson-plans',
  '/settings',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/premium')) {
    return handlePremiumApi(request);
  }

  if (premiumPages.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return handleDashboard(request);
  }

  return NextResponse.next();
}

async function handleDashboard(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (!session.isPremium && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/upgrade', request.url));
  }

  return NextResponse.next();
}

async function handlePremiumApi(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.isPremium && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
  }

  return NextResponse.next();
}

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
  ],
};