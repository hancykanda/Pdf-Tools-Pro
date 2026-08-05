import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { downloadFile } from '@/lib/minio';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await params;
  const objectName = path.map((segment) => decodeURIComponent(segment)).join('/');
  const { searchParams } = new URL(request.url);
  const disposition = searchParams.get('disposition') || 'inline';

  if (!objectName) {
    return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
  }

  // Files are stored under `${user.id}/...`; enforce ownership (prevents IDOR).
  if (!objectName.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stream = await downloadFile(objectName);
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream as unknown as AsyncIterable<Buffer>) {
            controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    const response = new NextResponse(readable);
    response.headers.set('Content-Type', 'application/octet-stream');
    response.headers.set(
      'Content-Disposition',
      `${disposition}; filename="${objectName.split('/').pop() || 'download'}"`
    );
    return response;
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
