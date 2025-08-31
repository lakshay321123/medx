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
    /\b\d+\s?(mg\/dL|g\/dL|mmol\/L)\b/i.test(text)
  );
}

function looksLikePrescription(text: string) {
  return (
    /\b\d+\s?(mg|mcg|ml|iu)\b/i.test(text) ||
    /\b(bid|tid|prn|qd|od)\b/i.test(text)
  );
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok: false, error: 'No file' }, { status: 400 });
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ ok: false, error: 'Only PDF supported' }, { status: 415 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    let text = '';
    try {
      text = await extractTextFromPDF(buf);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: `PDF parse error: ${e?.message || e}` },
        { status: 200 }
      );
    }

    if (!text) {
      return NextResponse.json({
        ok: true,
        detectedType: 'other',
        preview: '',
        note: 'No selectable text found (may be scanned).',
      });
    }

    let detected: DetectedType = 'other';
    if (looksLikeBloodReport(text)) detected = 'blood';
    else if (looksLikePrescription(text)) detected = 'prescription';

    return NextResponse.json({ ok: true, detectedType: detected, preview: text.slice(0, 1000) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message) }, { status: 500 });
  }
}
