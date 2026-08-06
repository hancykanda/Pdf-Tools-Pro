import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';
import { enqueuePremiumJob, type PremiumJobData } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPremiumAccess(user)) {
    return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
  }

  const body = await request.json();
  const { prompt, files, tool } = body as {
    prompt?: string;
    files?: { mimeType: string; data: string }[];
    tool?: string;
  };

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const jobId = await enqueuePremiumJob('ai-generate', {
      userId: user.id,
      tool: tool || 'ai-generate',
      prompt,
      files,
    } as PremiumJobData);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('AI generate error:', error);
    return NextResponse.json({ error: 'Failed to enqueue AI job' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
