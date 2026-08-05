import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadFile } from '@/lib/minio';
import { enqueuePremiumJob, type PremiumJobData } from '@/lib/queue';
import '@/lib/premiumWorker';
import { generateWithGemini } from '@/lib/gemini';
import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const headerText = formData.get('headerText') as string | null;
    const logoPosition = formData.get('logoPosition') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!headerText?.trim()) {
      return NextResponse.json({ error: 'Header text is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const objectName = `${user.id}/exam-header/${Date.now()}_${file.name}`;

    await uploadFile(objectName, buffer, buffer.length, file.type || 'application/pdf', {
      uploadedBy: user.id,
      originalName: file.name,
    });

    let detectionNote = '';
    try {
      const base64 = buffer.toString('base64');
      detectionNote = await generateWithGemini(
        `You are an exam header analyzer. The user wants to add/update the header text to: "${headerText}" at position "${logoPosition}". Briefly confirm if the PDF appears to have a header area and suggest the best y-position for header text.`
      );
    } catch {
      detectionNote = 'Header will be applied at the specified position.';
    }

    const jobId = await enqueuePremiumJob('exam-header-process', {
      userId: user.id,
      tool: 'exam-header',
      objectName,
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      headerText,
      logoPosition,
      detectionNote,
    } as PremiumJobData);

    return NextResponse.json({ objectName, jobId, fileName: file.name, size: buffer.length, detectionNote });
  } catch (error) {
    console.error('Exam header error:', error);
    return NextResponse.json({ error: 'Exam header customization failed' }, { status: 500 });
  }
}
