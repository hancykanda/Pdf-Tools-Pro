import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { downloadFile } from '@/lib/minio';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const disposition = searchParams.get('disposition') || 'inline';

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
  }

  try {
    const stream = downloadFile(id);
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream as unknown as AsyncIterable<Buffer>) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    const response = new NextResponse(readable);
    response.headers.set('Content-Type', 'application/octet-stream');
    response.headers.set('Content-Disposition', `${disposition}; filename="${id.split('/').pop() || 'download'}"`);
    return response;
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
