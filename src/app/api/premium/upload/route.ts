import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';
import { uploadFile } from '@/lib/minio';
import { dispatchPremiumJob, type PremiumJobData } from '@/lib/premiumDispatch';
import '@/lib/premiumWorker';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPremiumAccess(user)) {
    return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
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

  const allowedTools = [
    'ai-editor',
    'ocr',
    'ocr-organize',
    'exam-header',
    'exam-generator',
    'papers',
    'lesson-plans',
  ];
  if (!allowedTools.includes(tool)) {
    return NextResponse.json({ error: 'Invalid tool' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectName = `${user.id}/${tool}/${Date.now()}_${file.name}`;

  // Capture tool-specific parameters so they reach the worker.
  const extraFields = ['prompt', 'headerText', 'logoPosition', 'pageOrder', 'options'];
  const extra: Record<string, unknown> = {};
  for (const field of extraFields) {
    const value = formData.get(field);
    if (value !== null) extra[field] = value;
  }

  try {
    await uploadFile(objectName, buffer, buffer.length, file.type || 'application/octet-stream', {
      uploadedBy: user.id,
      originalName: file.name,
    });

    const jobId = await dispatchPremiumJob(`${tool}-process`, {
      userId: user.id,
      tool,
      objectName,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      ...extra,
    } as PremiumJobData);

    return NextResponse.json({ objectName, jobId, fileName: file.name, size: buffer.length });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
