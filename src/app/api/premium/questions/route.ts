import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPremiumAccess(user)) {
      return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
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
    if (!hasPremiumAccess(user)) {
      return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
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

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPremiumAccess(user)) {
      return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.text === 'string') data.text = body.text.trim();
    if (typeof body.subject === 'string') data.subject = body.subject.trim();
    if (typeof body.topic === 'string') data.topic = body.topic.trim();
    if (typeof body.classLevel === 'string') data.classLevel = body.classLevel.trim();
    if (typeof body.questionType === 'string') data.questionType = body.questionType;
    if (body.points !== undefined) data.points = Number(body.points) || 0;
    if (body.visibility === 'PUBLIC' || body.visibility === 'PRIVATE') data.visibility = body.visibility;
    if (body.options !== undefined) data.options = body.options;
    if (typeof body.answer === 'string') data.answer = body.answer;

    const question = await prisma.question.update({
      where: { id, userId: user.id },
      data,
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Questions PUT error:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPremiumAccess(user)) {
      return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await prisma.question.delete({ where: { id, userId: user.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Questions DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
