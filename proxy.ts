import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    return handleDashboard(request);
  }

  if (pathname.startsWith('/api/premium')) {
    return handlePremiumApi(request);
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
  matcher: ['/dashboard/:path*', '/api/premium/:path*'],
};