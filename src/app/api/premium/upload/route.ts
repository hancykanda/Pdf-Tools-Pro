import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadFile } from '@/lib/minio';
import { enqueuePremiumJob, type PremiumJobData } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const tool = formData.get('tool') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  if (!tool) {
    return NextResponse.json({ error: 'Tool name is required' }, { status: 400 });
  }

  const allowedTools = ['ai-editor', 'ocr', 'exam-header', 'exam-generator'];
  if (!allowedTools.includes(tool)) {
    return NextResponse.json({ error: 'Invalid tool' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectName = `${user.id}/${tool}/${Date.now()}_${file.name}`;

  try {
    await uploadFile(objectName, buffer, buffer.length, file.type || 'application/octet-stream', {
      uploadedBy: user.id,
      originalName: file.name,
    });

    const jobId = await enqueuePremiumJob(`${tool}-process`, {
      userId: user.id,
      tool,
      objectName,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
    } as PremiumJobData);

    return NextResponse.json({ objectName, jobId, fileName: file.name, size: buffer.length });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
