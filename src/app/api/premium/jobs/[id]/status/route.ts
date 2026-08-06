import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';
import { getJobStatus } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPremiumAccess(user)) {
    return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
  }

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  const status = await getJobStatus(id);
  if (!status) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ ...status, job: status });
}
