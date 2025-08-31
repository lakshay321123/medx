// app/api/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OCR_ENDPOINT = 'https://api.ocr.space/parse/image';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OCRSPACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing OCRSPACE_API_KEY' },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file' }, { status: 400 });
    }

    // Forward the uploaded file to OCR.space
    const fd = new FormData();
    fd.append('file', file, (file as any).name || 'upload.pdf');
    // Recommended params for PDFs; OCREngine=2 is fast & accurate for English
    fd.append('isOverlayRequired', 'false');
    fd.append('scale', 'true');
    fd.append('isTable', 'true');
    fd.append('OCREngine', '2'); // 1/2/3 per OCR.space docs

    const res = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      headers: { apikey: apiKey },
      body: fd,
      // Avoid Vercel cache for API calls
      cache: 'no-store',
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        { ok: false, error: `OCR HTTP ${res.status}: ${t}` },
        { status: 502 }
      );
    }

    const j = await res.json();

    // OCR.space success flag
    if (j?.IsErroredOnProcessing) {
      const msg =
        j?.ErrorMessage?.[0] ||
        j?.ErrorMessage ||
        'OCR provider reported an error';
      return NextResponse.json({ ok: false, error: String(msg) }, { status: 200 });
    }

    const parsed = Array.isArray(j?.ParsedResults) ? j.ParsedResults : [];
    const text = parsed.map((p: any) => p?.ParsedText || '').join('\n').trim();

    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
