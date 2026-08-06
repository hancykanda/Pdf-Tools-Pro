import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile, getPresignedUrl } from '@/lib/minio';

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
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId: user.id };
    if (subject) where.subject = subject;
    if (classLevel) where.classLevel = classLevel;
    if (status) where.status = status;

    const items = await prisma.paper.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const papersWithUrls = await Promise.all(
      items.map(async (paper) => ({
        ...paper,
        downloadUrl: await getPresignedUrl(paper.fileUrl, 3600),
      }))
    );

    return NextResponse.json({ items: papersWithUrls, total: items.length });
  } catch (error) {
    console.error('Papers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch papers' }, { status: 500 });
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const subject = formData.get('subject') as string | null;
    const classLevel = formData.get('classLevel') as string | null;
    const year = formData.get('year') as string | null;
    const term = formData.get('term') as string | null;

    if (!file || !title?.trim() || !subject?.trim() || !classLevel?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const objectName = `${user.id}/papers/${Date.now()}_${file.name}`;

    await uploadFile(objectName, buffer, buffer.length, file.type || 'application/pdf', {
      uploadedBy: user.id,
      originalName: file.name,
    });

    const paper = await prisma.paper.create({
      data: {
        userId: user.id,
        title: title.trim(),
        subject: subject.trim(),
        classLevel: classLevel.trim(),
        description: formData.get('description')?.toString() || null,
        fileUrl: objectName,
        fileName: file.name,
        fileSize: buffer.length,
        pageCount: Number(formData.get('pageCount')) || 0,
        status: 'DRAFT',
        year: year ? Number(year) : null,
        term: term || null,
      },
    });

    return NextResponse.json({ paper });
  } catch (error) {
    console.error('Papers POST error:', error);
    return NextResponse.json({ error: 'Failed to create paper' }, { status: 500 });
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

    await prisma.paper.delete({ where: { id, userId: user.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Papers DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete paper' }, { status: 500 });
  }
}
