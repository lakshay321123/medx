// app/api/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const key = process.env.OCRSPACE_API_KEY;
    if (!key) return NextResponse.json({ ok:false, error:'Missing OCRSPACE_API_KEY' }, { status: 500 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok:false, error:'No file' }, { status: 400 });

    const body = new FormData();
    body.append('apikey', key);
    body.append('file', file);
    body.append('language', 'eng');
    body.append('isTable', 'true');
    body.append('OCREngine', '2');

    const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body, cache: 'no-store' });

    const text = await res.text();           // provider might return HTML on error
    let j: any;
    try { j = JSON.parse(text); } catch { j = null; }

    if (!res.ok) {
      return NextResponse.json({ ok:false, error:`OCR HTTP ${res.status}`, provider:text.slice(0,300) }, { status: 502 });
    }
    if (!j) {
      return NextResponse.json({ ok:false, error:'OCR provider non-JSON', provider:text.slice(0,300) }, { status: 502 });
    }

    const parsed = Array.isArray(j?.ParsedResults) ? j.ParsedResults : [];
    const out = parsed.map((p: any) => p?.ParsedText || '').join('\n').trim();
    return NextResponse.json({ ok:true, text: out });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
