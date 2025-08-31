import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // file uploads need node runtime

// 10 MB default cap (adjust as needed)
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain'
];

export async function POST(req: NextRequest) {
  try {
    // IMPORTANT: for App Router route handlers, use formData() for multipart
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

    // Read into ArrayBuffer/Buffer
    const buf = Buffer.from(await file.arrayBuffer());

    // 👉 TODO: plug in your existing OCR/text-extraction here
    // For now we just return metadata and a tiny preview of bytes
    const preview = buf.subarray(0, 32).toString('hex');

    // Example: you might route by type later
    // if (file.type === 'application/pdf') { ...extractPdfText(buf) }
    // if (file.type.startsWith('image/')) { ...ocrImage(buf) }

    return NextResponse.json({
      ok: true,
      name: file.name,
      type: file.type,
      size: file.size,
      previewHexFirst32: preview
      // extractedText: '...', // <-- add when OCR hooked up
    });
  } catch (e: any) {
    // Always return JSON so the client can parse without crashing
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

