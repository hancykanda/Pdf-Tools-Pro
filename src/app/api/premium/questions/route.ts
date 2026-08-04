import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const classLevel = searchParams.get('classLevel');
    const visibility = searchParams.get('visibility');

    const where: Record<string, unknown> = { userId: user.id };
    if (subject) where.subject = subject;
    if (classLevel) where.classLevel = classLevel;
    if (visibility) where.visibility = visibility;

    const items = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error('Questions GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, subject, topic, classLevel, questionType, points, visibility } = body;

    if (!text?.trim() || !subject?.trim() || !topic?.trim() || !classLevel?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        userId: user.id,
        text: text.trim(),
        subject: subject.trim(),
        topic: topic.trim(),
        classLevel: classLevel.trim(),
        questionType: questionType || 'Multiple Choice',
        points: Number(points) || 5,
        visibility: visibility || 'PRIVATE',
        options: body.options || null,
        answer: body.answer || '',
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Questions POST error:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
