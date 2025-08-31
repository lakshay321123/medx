import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Very small/illustrative reference ranges (adults). You can extend per lab.
const RANGES: Record<string, {unit: string, min: number, max: number, label: string}> = {
  'hemoglobin':        { unit:'g/dL',   min: 12,   max: 17.5, label: 'Hemoglobin' },
  'hb':                { unit:'g/dL',   min: 12,   max: 17.5, label: 'Hemoglobin' },
  'wbc':               { unit:'/µL',    min: 4000, max: 11000, label: 'WBC' },
  'platelet':          { unit:'/µL',    min:150000,max: 450000, label: 'Platelet' },
  'platelets':         { unit:'/µL',    min:150000,max: 450000, label: 'Platelet' },
  'rbc':               { unit:'M/µL',   min: 4,    max: 6,     label: 'RBC' },
  'hct':               { unit:'%',      min: 36,   max: 52,    label: 'Hematocrit' },
  'mcv':               { unit:'fL',     min: 80,   max: 100,   label: 'MCV' },
  'mch':               { unit:'pg',     min: 27,   max: 34,    label: 'MCH' },
  'mchc':              { unit:'g/dL',   min: 32,   max: 36,    label: 'MCHC' },
  'glucose':           { unit:'mg/dL',  min: 70,   max: 100,   label: 'Fasting Glucose' },
  'creatinine':        { unit:'mg/dL',  min: 0.6,  max: 1.3,   label: 'Creatinine' },
  'bun':               { unit:'mg/dL',  min: 7,    max: 20,    label: 'BUN' },
  'sodium':            { unit:'mmol/L', min: 135,  max: 145,   label: 'Sodium' },
  'potassium':         { unit:'mmol/L', min: 3.5,  max: 5.1,   label: 'Potassium' },
  'chloride':          { unit:'mmol/L', min: 98,   max: 107,   label: 'Chloride' },
  'bicarbonate':       { unit:'mmol/L', min: 22,   max: 29,    label: 'Bicarbonate' },
  'calcium':           { unit:'mg/dL',  min: 8.5,  max: 10.5,  label: 'Calcium' },
  'alt':               { unit:'U/L',    min: 7,    max: 56,    label: 'ALT' },
  'ast':               { unit:'U/L',    min: 10,   max: 40,    label: 'AST' },
  'alkaline phosphatase': { unit:'U/L', min: 44,   max: 147,   label: 'Alkaline phosphatase' },
  'bilirubin':         { unit:'mg/dL',  min: 0.1,  max: 1.2,   label: 'Bilirubin (total)' },
  'tsh':               { unit:'µIU/mL', min: 0.4,  max: 4.5,   label: 'TSH' },
  't3':                { unit:'ng/dL',  min: 80,   max: 180,   label: 'T3' },
  't4':                { unit:'µg/dL',  min: 5,    max: 12,    label: 'T4' },
  'ldl':               { unit:'mg/dL',  min: 0,    max: 100,   label: 'LDL (calc)' },
  'hdl':               { unit:'mg/dL',  min: 40,   max: 100,   label: 'HDL' },
  'triglycerides':     { unit:'mg/dL',  min: 0,    max: 150,   label: 'Triglycerides' }
};

// Basic number + unit picker, tolerant of formats like "Hb 13.2 g/dL"
const VAL_RE = /([A-Za-z][A-Za-z \-\/%()]*[A-Za-z])[^0-9\-]*(-?\d+(?:\.\d+)?)\s*([a-zA-Zµ\/%]+)?/g;

function normalizeKey(k: string) {
  return k.toLowerCase().replace(/[^a-z]/g, '');
}

function findCandidates(text: string) {
  const out: {raw:string, name:string, value:number, unit?:string}[] = [];
  let m: RegExpExecArray | null;
  while ((m = VAL_RE.exec(text)) !== null) {
    const rawName = m[1].trim();
    const value = Number(m[2]);
    const unit = m[3]?.trim();
    if (!Number.isFinite(value)) continue;
    out.push({ raw: m[0], name: rawName, value, unit });
  }
  return out;
}

function mapToRanges(cands: ReturnType<typeof findCandidates>) {
  const items: { label:string, key:string, value:number, unit?:string, ref?:{min:number,max:number,unit:string}, status:'low'|'normal'|'high'|'unknown' }[] = [];
  for (const c of cands) {
    const k = normalizeKey(c.name);
    const matchKey = Object.keys(RANGES).find(rk => k.includes(normalizeKey(rk)));
    if (!matchKey) {
      items.push({ label: c.name, key: k, value: c.value, unit: c.unit, status: 'unknown' });
      continue;
    }
    const ref = RANGES[matchKey];
    let status: 'low'|'normal'|'high' = 'normal';
    if (c.value < ref.min) status = 'low';
    else if (c.value > ref.max) status = 'high';
    items.push({
      label: ref.label,
      key: matchKey,
      value: c.value,
      unit: c.unit || ref.unit,
      ref: { min: ref.min, max: ref.max, unit: ref.unit },
      status
    });
  }
  return items;
}

function makeSummary(items: ReturnType<typeof mapToRanges>) {
  const highs = items.filter(i => i.status === 'high').map(i => i.label);
  const lows  = items.filter(i => i.status === 'low').map(i => i.label);
  const abn   = [...highs, ...lows];

  if (!items.length) return 'No recognizable lab values were found in the report text.';
  if (!abn.length)   return 'All parsed lab values are within common adult reference ranges.';

  const parts:string[] = [];
  if (highs.length) parts.push(`High: ${highs.join(', ')}`);
  if (lows.length)  parts.push(`Low: ${lows.join(', ')}`);
  parts.push('Please discuss results with your clinician; ranges vary by lab, age, sex, and context.');
  return parts.join(' • ');
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok:false, error:'No file' }, { status: 400 });
    if (file.type !== 'application/pdf') return NextResponse.json({ ok:false, error:'File must be a PDF' }, { status: 415 });

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
        text: '',
        values: [],
        summary: 'No selectable text found (the PDF may be a scan).'
      });
    }

    const cands  = findCandidates(text);
    const items  = mapToRanges(cands);
    const summary = makeSummary(items);

    return NextResponse.json({
      ok: true,
      text,
      values: items,   // [{label,key,value,unit,ref?,status}]
      summary,
      disclaimer: 'This is an automated summary for educational use only and is not medical advice. Please consult your clinician.'
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
