import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_TYPES = ['application/pdf','image/png','image/jpeg','text/plain'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/upload', runtime: 'nodejs' });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: 'File type not allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: 'File too large' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());

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

