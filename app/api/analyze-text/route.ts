import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type DetectedType = 'blood' | 'prescription' | 'other';

const isBlood = (t: string) =>
  /hemoglobin|hematocrit|wbc|platelet/i.test(t) ||
  /\b\d+\s?(mg\/dL|g\/dL|mmol\/L|g\/L|µIU\/mL|U\/L|%|fL|pg)\b/i.test(t);

const isRx = (t: string) =>
  /\b\d+\s?(mg|mcg|ml|iu|g)\b/i.test(t) ||
  /\b(bid|tid|prn|qd|od|qhs|qam|po|iv|im|sc|ac|pc)\b/i.test(t);

export async function GET() {
  return NextResponse.json({ ok: true, ping: 'analyze-text-alive' });
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ ok:false, error:'No text' }, { status:400 });
    }

    let detected: DetectedType = 'other';
    if (isBlood(text)) detected = 'blood';
    else if (isRx(text)) detected = 'prescription';

    return NextResponse.json({
      ok: true,
      detectedType: detected,
      preview: text.replace(/\s+/g, ' ').slice(0, 1500),
      source: 'ocr'
    });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message || e) }, { status:500 });
  }
}
