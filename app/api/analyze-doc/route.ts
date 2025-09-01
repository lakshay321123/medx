import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdftext';

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
  return NextResponse.json({ ok: true, ping: 'analyze-doc-alive' });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) return NextResponse.json({ ok:false, error:'No file' }, { status:400 });
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ ok:false, error:'Only PDF supported' }, { status:415 });
    }

    let text = '';
    let parseNote: string | undefined;

    try {
      const buf = Buffer.from(await file.arrayBuffer());
      text = await extractTextFromPDF(buf);
    } catch (err: any) {
      // Graceful fallback instead of crashing
      parseNote = `Couldn’t extract text (possibly scanned PDF or unusual encoding). ${err?.message || String(err)}`;
    }

    if (!text) {
      return NextResponse.json({
        ok: true,
        detectedType: 'other' as DetectedType,
        preview: '',
        note: parseNote || 'No selectable text found (likely a scanned PDF). OCR is not enabled yet.',
        nextSteps: 'Re-upload a text-based PDF or enable OCR support later.',
      });
    }

    let detected: DetectedType = 'other';
    if (isBlood(text)) detected = 'blood';
    else if (isRx(text)) detected = 'prescription';

    return NextResponse.json({
      ok: true,
      detectedType: detected,
      preview: text.replace(/\s+/g, ' ').slice(0, 1200),
    });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message || e) }, { status:500 });
  }
}
