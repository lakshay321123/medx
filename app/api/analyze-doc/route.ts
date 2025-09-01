import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdftext';

export const runtime = 'nodejs';
export const maxDuration = 60;

type DetectedType = 'blood' | 'prescription' | 'other';

function looksLikeBloodReport(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes('hemoglobin') ||
    t.includes('hematocrit') ||
    t.includes('wbc') ||
    t.includes('platelet') ||
    /\b\d+\s?(mg\/dL|g\/dL|mmol\/L|g\/L|µIU\/mL|U\/L|%|fL|pg)\b/i.test(text)
  );
}
function looksLikePrescription(text: string) {
  return (
    /\b\d+\s?(mg|mcg|ml|iu|g)\b/i.test(text) ||
    /\b(bid|tid|prn|qd|od|qhs|qam|po|iv|im|sc|ac|pc)\b/i.test(text)
  );
}

export async function GET() {
  return NextResponse.json({ ok: true, ping: 'analyze-doc-alive' });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) return NextResponse.json({ ok:false, error:'No file' }, { status:400 });
    if (file.type !== 'application/pdf')
      return NextResponse.json({ ok:false, error:'Only PDF supported' }, { status:415 });

    let text = '';
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      text = await extractTextFromPDF(buf);
    } catch (err: any) {
      return NextResponse.json({ ok:false, error:`PDF parse error: ${err?.message || String(err)}` }, { status:200 });
    }

    if (!text) {
      return NextResponse.json({
        ok:true,
        detectedType:'other' as DetectedType,
        preview:'',
        note:'No selectable text found (may be a scanned PDF).',
      });
    }

    let detected: DetectedType = 'other';
    if (looksLikeBloodReport(text)) detected = 'blood';
    else if (looksLikePrescription(text)) detected = 'prescription';

    return NextResponse.json({
      ok:true,
      detectedType: detected,
      preview: text.replace(/\s+/g, ' ').slice(0, 1200),
    });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message || e) }, { status:500 });
  }
}
