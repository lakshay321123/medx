import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // required for file handling libs

// Health check: GET /api/upload
export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/upload', runtime: 'nodejs' });
}

// Upload: POST /api/upload (multipart/form-data)
export async function POST(req: NextRequest) {
  try {
    // Important: App Router supports multipart via formData()
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Read bytes
    const buf = Buffer.from(await file.arrayBuffer());

    // TODO: (later) plug in pdf-parse / OCR here to produce extractedText
    // For now, return metadata so client can safely parse JSON
    return NextResponse.json({
      ok: true,
      name: file.name,
      type: file.type,
      size: file.size,
      previewHexFirst32: buf.subarray(0, 32).toString('hex')
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

