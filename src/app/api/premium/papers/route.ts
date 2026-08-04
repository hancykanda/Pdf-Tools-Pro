import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({ items: [], total: 0 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}