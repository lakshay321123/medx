// app/api/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // keep long OCR calls alive

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

    const fd = new FormData();
    fd.append('file', file, (file as any).name || 'upload.pdf');
    fd.append('isOverlayRequired', 'false');
    fd.append('scale', 'true');
    fd.append('isTable', 'true');
    fd.append('OCREngine', '2');

    const res = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      headers: { apikey: apiKey },
      body: fd,
      cache: 'no-store',
    });

    const raw = await res.text();
    // Always return JSON to the client even if provider responds non-JSON
    let body: any = null;
    try { body = JSON.parse(raw); } catch { /* leave as null */ }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `OCR HTTP ${res.status}`, provider: raw?.slice(0, 300) },
        { status: 502 }
      );
    }

    if (!body) {
      return NextResponse.json(
        { ok: false, error: 'OCR provider returned non-JSON', provider: raw?.slice(0, 300) },
        { status: 502 }
      );
    }

    if (body?.IsErroredOnProcessing) {
      const msg = body?.ErrorMessage?.[0] || body?.ErrorMessage || 'OCR provider reported an error';
      return NextResponse.json({ ok: false, error: String(msg) }, { status: 200 });
    }

    const parsed = Array.isArray(body?.ParsedResults) ? body.ParsedResults : [];
    const text = parsed.map((p: any) => p?.ParsedText || '').join('\n').trim();

    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
