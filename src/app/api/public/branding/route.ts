import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSiteBranding } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** Public, unauthenticated — returns only branding-safe fields. */
export async function GET() {
  try {
    const branding = await getSiteBranding();
    return NextResponse.json(branding);
  } catch {
    return NextResponse.json({
      siteName: 'PDF Master',
      siteTagline: 'Pro Document Platform',
      siteLogoUrl: '',
      sitePrimaryColor: '#E11D48',
    });
  }
}
