import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';
import { uploadFile } from '@/lib/minio';
import { enqueuePremiumJob, type PremiumJobData } from '@/lib/queue';
import '@/lib/premiumWorker';
import { generateWithGemini } from '@/lib/gemini';

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const objectName = `${user.id}/ocr/${Date.now()}_${file.name}`;

    await uploadFile(objectName, buffer, buffer.length, file.type || 'application/octet-stream', {
      uploadedBy: user.id,
      originalName: file.name,
    });

    let ocrText = '';
    try {
      const base64 = buffer.toString('base64');
      ocrText = await generateWithGemini(
        'Extract all readable text from this document image/PDF page. Return the text content only, preserving structure where possible.'
      );
    } catch {
      ocrText = 'OCR processing encountered an issue.';
    }

    const jobId = await enqueuePremiumJob('ocr-process', {
      userId: user.id,
      tool: 'ocr',
      objectName,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      text: ocrText,
    } as PremiumJobData);

    return NextResponse.json({ objectName, jobId, fileName: file.name, size: buffer.length, text: ocrText });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 });
  }
}
