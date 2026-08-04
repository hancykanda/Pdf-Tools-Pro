import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, format = 'image/jpeg', quality = 0.92 } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    // Note: For Next.js route handlers, canvas/DOM APIs are not available.
    // This endpoint validates the PDF upload; actual image rendering happens in the client page via pdfjs-dist.
    return Response.json({
      ok: true,
      filename: 'document.pdf',
      message: 'PDF received. Rendering is handled client-side.',
    });
  } catch (error) {
    console.error('PDF to image error:', error);
    return Response.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
}