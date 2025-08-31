import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // IMPORTANT: file uploads need Node, not Edge

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain'
];

// Optional: simple health check so you can hit GET /api/upload in browser
export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/upload', runtime: 'nodejs' });
}

export async function POST(req: NextRequest) {
  try {
    // Must use formData() for multipart/form-data
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ ok: false, error: `Unsupported file type: ${file.type}` }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: `File too large (> ${MAX_BYTES} bytes)` }, { status: 413 });
    }

    // Read file bytes
    const buf = Buffer.from(await file.arrayBuffer());

    // TODO: Hook in your extractor / OCR here (PDF or image)
    // const extractedText = await extractText(buf, file.type);

    // Always return JSON (never empty HTML) so response.json() is safe
    return NextResponse.json({
      ok: true,
      name: file.name,
      type: file.type,
      size: file.size,
      // extractedText,
      // For quick debug:
      previewHexFirst32: buf.subarray(0, 32).toString('hex')
    });
  } catch (e: any) {
    // Ensure we still return JSON on error
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

