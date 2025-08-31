// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type DetectedType = 'blood' | 'prescription' | 'other';

function looksLikeBloodReport(text: string): boolean {
  const t = text.toLowerCase();
  const labHints = [
    'hemoglobin', 'hematocrit', 'hct', 'hb', 'wbc', 'rbc', 'platelet', 'platelets',
    'mcv', 'mch', 'mchc', 'rdw', 'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil',
    'glucose', 'creatinine', 'bun', 'sodium', 'potassium', 'chloride', 'bicarbonate', 'calcium',
    'alt', 'ast', 'alkaline phosphatase', 'bilirubin', 'tsh', 't3', 't4', 'ldl', 'hdl', 'triglycerides'
  ];
  let hits = 0;
  for (const h of labHints) if (t.includes(h)) hits++;
  // also look for table-ish lines with units
  const unitish = /\b(\d+(?:\.\d+)?)\s?(mg\/dL|g\/dL|mmol\/L|µIU\/mL|U\/L|fL|pg|%)\b/i;
  return hits >= 2 || unitish.test(text);
}

function looksLikePrescription(text: string): boolean {
  const t = text.toLowerCase();
  // common prescription patterns: drug + dose + freq words
  const dose = /\b\d+(\.\d+)?\s?(mg|mcg|g|ml|iu)\b/i;
  const freq = /\b(qd|od|bid|tid|qid|qhs|qam|prn|po|iv|im|sc|hs|ac|pc|once daily|twice daily|three times)\b/i;
  const rxWords = /\bprescription\b|\brx\b|\bsig\b|\bdirection\b/i;
  let score = 0;
  if (dose.test(text)) score++;
  if (freq.test(text)) score++;
  if (rxWords.test(t)) score++;
  // medicines often appear capitalized words followed by dose
  const medDose = /\b[A-Z][a-zA-Z\-]{2,}\s+\d+(?:\.\d+)?\s?(mg|mcg|g|ml)\b/;
  if (medDose.test(text)) score++;
  return score >= 2;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok:false, error:'No file' }, { status: 400 });
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ ok:false, error:'Only PDF is supported here' }, { status: 415 });
    }

    const pdf = (await import('pdf-parse')).default;
    const buf = Buffer.from(await file.arrayBuffer());

    let text = '';
    try {
      const out = await pdf(buf);
      text = (out.text || '').replace(/\u0000/g, '').trim();
    } catch (e:any) {
      return NextResponse.json({ ok:false, error:`PDF parse error: ${e?.message||e}` }, { status: 200 });
    }

    if (!text) {
      return NextResponse.json({
        ok: true,
        detectedType: 'other' as DetectedType,
        preview: '',
        note: 'No selectable text found (may be a scanned PDF). You can enable OCR later.',
      });
    }

    let detectedType: DetectedType = 'other';
    if (looksLikeBloodReport(text)) detectedType = 'blood';
    else if (looksLikePrescription(text)) detectedType = 'prescription';

    // short preview to show the user (first ~600 chars, single-lined)
    const preview = text.replace(/\s+/g, ' ').slice(0, 600);

    return NextResponse.json({
      ok: true,
      detectedType,
      preview,
      suggestions:
        detectedType === 'blood'
          ? ['Analyze blood report']
          : detectedType === 'prescription'
          ? ['Extract medicines']
          : ['Show full text'],
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
