// app/api/analyze-doc/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ ok:false, error:'No file uploaded' }, { status:400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ ok:false, error:'Only PDF supported' }, { status:415 });
    }

    const pdf = (await import('pdf-parse')).default;
    const buf = Buffer.from(await file.arrayBuffer());

    let text = '';
    try {
      const out = await pdf(buf);
      text = (out.text || '').replace(/\u0000/g, '').trim();
    } catch (e: any) {
      return NextResponse.json({ ok:false, error:`PDF parse error: ${e?.message}` }, { status:200 });
    }

    if (!text) {
      return NextResponse.json({ 
        ok: true,
        detectedType: 'other',
        preview: '',
        note: 'No text found. (Might be a scanned image, OCR needed.)'
      });
    }

    // Just to test, return the raw text for now:
    return NextResponse.json({
      ok: true,
      detectedType: 'other',
      preview: text.slice(0, 500)
    });

  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message || e) }, { status:500 });
  }
}
