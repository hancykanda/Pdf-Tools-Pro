import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TYPES = ['questions', 'papers', 'lessonPlans', 'examHeaders'] as const;
type ContentType = (typeof TYPES)[number];

function countByType(type: ContentType): Promise<number> {
  switch (type) {
    case 'questions':
      return prisma.question.count();
    case 'papers':
      return prisma.paper.count();
    case 'lessonPlans':
      return prisma.lessonPlan.count();
    case 'examHeaders':
      return prisma.examHeader.count();
  }
}

export async function GET() {
  try {
    await requireRole(['ADMIN']);
    const [questions, papers, lessonPlans, examHeaders] = await Promise.all(
      TYPES.map((t) => countByType(t)),
    );
    return NextResponse.json({ questions, papers, lessonPlans, examHeaders });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const body = await request.json();
    const type = String(body.type ?? '') as ContentType;
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const id = typeof body.id === 'string' ? body.id : undefined;
    if (id) {
      switch (type) {
        case 'questions':
          await prisma.question.delete({ where: { id } });
          break;
        case 'papers':
          await prisma.paper.delete({ where: { id } });
          break;
        case 'lessonPlans':
          await prisma.lessonPlan.delete({ where: { id } });
          break;
        case 'examHeaders':
          await prisma.examHeader.delete({ where: { id } });
          break;
      }
      return NextResponse.json({ ok: true, deleted: 1 });
    }

    if (body.confirm !== true) {
      return NextResponse.json({ error: 'Set confirm=true to delete all of this type' }, { status: 400 });
    }

    let deleted = 0;
    switch (type) {
      case 'questions':
        deleted = (await prisma.question.deleteMany()).count;
        break;
      case 'papers':
        deleted = (await prisma.paper.deleteMany()).count;
        break;
      case 'lessonPlans':
        deleted = (await prisma.lessonPlan.deleteMany()).count;
        break;
      case 'examHeaders':
        deleted = (await prisma.examHeader.deleteMany()).count;
        break;
    }
    return NextResponse.json({ ok: true, deleted });
  } catch {
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 400 });
  }
}
