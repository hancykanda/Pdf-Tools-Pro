import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateWithGemini } from '@/lib/gemini';

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

    const where: Record<string, unknown> = { userId: user.id };
    if (subject) where.subject = subject;
    if (classLevel) where.classLevel = classLevel;

    const items = await prisma.lessonPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error('Lesson plans GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch lesson plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, subject, classLevel, topic, durationMinutes, aiGenerated, content } = body;

    if (!title?.trim() || !subject?.trim() || !classLevel?.trim() || !topic?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let generatedContent = content || '';
    if (aiGenerated && !content) {
      try {
        generatedContent = await generateWithGemini(
          `Create a detailed lesson plan for ${classLevel} ${subject} on the topic "${topic}". Include objectives, materials, introduction, main activity, and assessment.`
        );
      } catch {
        generatedContent = 'Lesson plan content could not be generated. Please try again.';
      }
    }

    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        userId: user.id,
        title: title.trim(),
        subject: subject.trim(),
        classLevel: classLevel.trim(),
        topic: topic.trim(),
        durationMinutes: Number(durationMinutes) || 45,
        objectives: generatedContent,
        materials: 'Whiteboard, markers, handouts',
        content: generatedContent,
        aiGenerated: Boolean(aiGenerated),
      },
    });

    return NextResponse.json({ lessonPlan });
  } catch (error) {
    console.error('Lesson plans POST error:', error);
    return NextResponse.json({ error: 'Failed to create lesson plan' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await prisma.lessonPlan.delete({ where: { id, userId: user.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Lesson plans DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete lesson plan' }, { status: 500 });
  }
}
