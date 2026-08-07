import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/minio';
import { dispatchPremiumJob, type PremiumJobData } from '@/lib/premiumDispatch';
import '@/lib/premiumWorker';
import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';

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
    const { className, subject, topics, questionCount } = body;

    if (!className?.trim() || !subject?.trim()) {
      return NextResponse.json({ error: 'Class and subject are required' }, { status: 400 });
    }

    const topicList = Array.isArray(topics) ? topics : [];
    const count = Number(questionCount) || 10;

    const where: Record<string, unknown> = {
      OR: [{ visibility: 'PUBLIC' }, { userId: user.id }],
      subject: subject.trim(),
    };
    if (topicList.length > 0) {
      where.topic = { in: topicList };
    }

    const questions = await prisma.question.findMany({
      where,
      take: count,
      orderBy: { createdAt: 'desc' },
    });

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for the selected criteria' }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont('Helvetica');
    const boldFont = await pdfDoc.embedFont('Helvetica-Bold');

    let currentPage = pdfDoc.addPage([595.28, 841.89]);
    let y = 800;

    const drawText = (text: string, x: number, yPos: number, f = font, size = 12) => {
      currentPage.drawText(text, { x, y: yPos, size, font: f });
    };

    drawText(`${className} - ${subject} Exam`, 50, y, boldFont, 18);
    y -= 30;
    drawText(`Generated on ${new Date().toLocaleDateString()}`, 50, y, font, 12);
    y -= 40;

    questions.forEach((q, index) => {
      if (y < 100) {
        currentPage = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }

      drawText(`${index + 1}. ${q.text}`, 50, y, boldFont, 12);
      y -= 25;
      drawText(`   (${q.points} points)`, 50, y, font, 10);
      y -= 35;
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    const objectName = `${user.id}/exam-generator/${Date.now()}_exam.pdf`;

    await uploadFile(objectName, buffer, buffer.length, 'application/pdf', {
      uploadedBy: user.id,
      originalName: 'exam.pdf',
    });

    const jobId = await dispatchPremiumJob('exam-generator-process', {
      userId: user.id,
      tool: 'exam-generator',
      objectName,
      fileName: 'exam.pdf',
      mimeType: 'application/pdf',
      questionCount: questions.length,
    } as PremiumJobData);

    return NextResponse.json({ objectName, jobId, questionCount: questions.length });
  } catch (error) {
    console.error('Exam generator error:', error);
    return NextResponse.json({ error: 'Exam generation failed' }, { status: 500 });
  }
}
