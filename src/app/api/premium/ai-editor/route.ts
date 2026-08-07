import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPremiumAccess } from '@/lib/auth';
import { uploadFile } from '@/lib/minio';
import { dispatchPremiumJob, type PremiumJobData } from '@/lib/premiumDispatch';
import '@/lib/premiumWorker';
import { generateWithGemini } from '@/lib/gemini';
import { PDFDocument } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

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
    const prompt = formData.get('prompt') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const objectName = `${user.id}/ai-editor/${Date.now()}_${file.name}`;

    await uploadFile(objectName, buffer, buffer.length, file.type || 'application/pdf', {
      uploadedBy: user.id,
      originalName: file.name,
    });

    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPages().length;

    let aiInstruction = '';
    try {
      const base64 = buffer.toString('base64');
      aiInstruction = await generateWithGemini(
        `You are a PDF editing assistant. The user wants to edit a PDF with ${pageCount} pages. User request: "${prompt}". Provide concise editing instructions for applying this change to the PDF. If the request is not feasible, say "No changes needed".`
      );
    } catch {
      aiInstruction = 'Apply the requested edit conservatively while preserving existing content.';
    }

    const jobId = await dispatchPremiumJob('ai-editor-process', {
      userId: user.id,
      tool: 'ai-editor',
      objectName,
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      prompt,
      aiInstruction,
    } as PremiumJobData);

    return NextResponse.json({ objectName, jobId, fileName: file.name, size: buffer.length, aiInstruction });
  } catch (error) {
    console.error('AI editor error:', error);
    return NextResponse.json({ error: 'AI editing failed' }, { status: 500 });
  }
}
