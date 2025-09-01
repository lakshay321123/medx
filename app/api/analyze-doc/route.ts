// app/api/analyze-doc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdftext';
import { summarizeChunks, chunkText } from '@/lib/llm';
import { ocrBuffer } from '@/lib/ocr';

export const runtime = 'nodejs';
export const maxDuration = 60;

type DetectedType = 'blood' | 'prescription' | 'other';

// ---------- JSON helper (force JSON on every return) ----------
function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// ---------- Heuristics ----------
const LAB_RANGES: Record<string, {unit: string, min: number, max: number, label: string}> = {
  hemoglobin:{unit:'g/dL',min:12,max:17.5,label:'Hemoglobin'},
  hb:{unit:'g/dL',min:12,max:17.5,label:'Hemoglobin'},
  wbc:{unit:'/µL',min:4000,max:11000,label:'WBC'},
  platelet:{unit:'/µL',min:150000,max:450000,label:'Platelet'},
  platelets:{unit:'/µL',min:150000,max:450000,label:'Platelet'},
  rbc:{unit:'M/µL',min:4,max:6,label:'RBC'},
  hct:{unit:'%',min:36,max:52,label:'Hematocrit'},
  mcv:{unit:'fL',min:80,max:100,label:'MCV'},
  mch:{unit:'pg',min:27,max:34,label:'MCH'},
  mchc:{unit:'g/dL',min:32,max:36,label:'MCHC'},
  glucose:{unit:'mg/dL',min:70,max:100,label:'Fasting Glucose'},
  creatinine:{unit:'mg/dL',min:0.6,max:1.3,label:'Creatinine'},
  bun:{unit:'mg/dL',min:7,max:20,label:'BUN'},
  sodium:{unit:'mmol/L',min:135,max:145,label:'Sodium'},
  potassium:{unit:'mmol/L',min:3.5,max:5.1,label:'Potassium'},
  chloride:{unit:'mmol/L',min:98,max:107,label:'Chloride'},
  bicarbonate:{unit:'mmol/L',min:22,max:29,label:'Bicarbonate'},
  calcium:{unit:'mg/dL',min:8.5,max:10.5,label:'Calcium'},
  alt:{unit:'U/L',min:7,max:56,label:'ALT'},
  ast:{unit:'U/L',min:10,max:40,label:'AST'},
  'alkaline phosphatase':{unit:'U/L',min:44,max:147,label:'Alkaline phosphatase'},
  bilirubin:{unit:'mg/dL',min:0.1,max:1.2,label:'Bilirubin (total)'},
  tsh:{unit:'µIU/mL',min:0.4,max:4.5,label:'TSH'},
  t3:{unit:'ng/dL',min:80,max:180,label:'T3'},
  t4:{unit:'µg/dL',min:5,max:12,label:'T4'},
  ldl:{unit:'mg/dL',min:0,max:100,label:'LDL (calc)'},
  hdl:{unit:'mg/dL',min:40,max:100,label:'HDL'},
  triglycerides:{unit:'mg/dL',min:0,max:150,label:'Triglycerides'},
};

const VAL_RE = /([A-Za-z][A-Za-z \-\/%()]*[A-Za-z])[^0-9\-]*(-?\d+(?:\.\d+)?)\s*([a-zA-Zµ\/%]+)?/g;
const normKey = (k: string) => k.toLowerCase().replace(/[^a-z]/g, '');

function looksLikeBlood(text: string) {
  const t = text.toLowerCase();
  const labHints = ['hemoglobin','hematocrit','hb','hct','wbc','rbc','platelet','mcv','mch','mchc','tsh','t3','t4','ldl','hdl','triglycerides','creatinine','alt','ast','bilirubin','glucose','sodium','potassium'];
  let hits = 0;
  for (const h of labHints) if (t.includes(h)) hits++;
  return hits >= 3 || /\b(\d+(?:\.\d+)?)\s?(mg\/dL|g\/dL|mmol\/L|µIU\/mL|U\/L|fL|pg|%)\b/i.test(text);
}
function looksLikeRx(text: string) {
  const dose = /\b\d+(\.\d+)?\s?(mg|mcg|g|ml|iu)\b/i;
  const freq = /\b(qd|od|bid|tid|qid|qhs|qam|prn|po|iv|im|sc|hs|ac|pc|once daily|twice daily)\b/i;
  const medDose = /\b[A-Z][a-zA-Z\-]{2,}\s+\d+(?:\.\d+)?\s?(mg|mcg|g|ml)\b/;
  let score = 0; if (dose.test(text)) score++; if (freq.test(text)) score++; if (medDose.test(text)) score++;
  return score >= 2;
}

function labCandidates(text: string) {
  const out: { name: string; value: number; unit?: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = VAL_RE.exec(text)) !== null) {
    const name = m[1].trim();
    const value = Number(m[2]);
    const unit = m[3]?.trim();
    if (Number.isFinite(value)) out.push({ name, value, unit });
  }
  return out;
}
function labMap(cs: ReturnType<typeof labCandidates>) {
  return cs.map(c => {
    const k = normKey(c.name);
    const rk = Object.keys(LAB_RANGES).find(key => k.includes(normKey(key)));
    if (!rk) return { label: c.name, key: k, value: c.value, unit: c.unit, status: 'unknown' as const };
    const ref = LAB_RANGES[rk];
    const unit = c.unit || ref.unit;
    let status: 'low'|'normal'|'high' = 'normal';
    if (c.value < ref.min) status = 'low'; else if (c.value > ref.max) status = 'high';
    return { label: ref.label, key: rk, value: c.value, unit, ref: { min: ref.min, max: ref.max, unit: ref.unit }, status };
  });
}
function labSummary(items: any[]) {
  if (!items.length) return 'No recognizable lab values found.';
  const highs = items.filter(i => i.status === 'high').map(i => i.label);
  const lows  = items.filter(i => i.status === 'low').map(i => i.label);
  if (!highs.length && !lows.length) return 'All parsed lab values are within common adult reference ranges.';
  const parts: string[] = [];
  if (highs.length) parts.push(`High: ${highs.join(', ')}`);
  if (lows.length)  parts.push(`Low: ${lows.join(', ')}`);
  parts.push('Ranges vary by lab/age/sex; discuss with your clinician.');
  return parts.join(' • ');
}

// RxNorm helpers
function cleanToken(t: string): string {
  return t
    .replace(/[^\w\s\-\+\/\.]/g, ' ')
    .replace(/\b(tab(?:let)?|cap(?:sule)?|syrup|susp(?:ension)?|drop(?:s)?|inj(?:ection)?|cream|gel|ointment|soln|solution)\b/gi, ' ')
    .replace(/\b(\d+(?:\.\d+)?)(mg|mcg|g|ml|iu)\b/gi, ' ')
    .replace(/\b(qd|od|bid|tid|qid|qhs|qam|prn|po|iv|im|sc|hs|ac|pc)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
async function rxcuiForName(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json().catch(()=>null);
    return j?.idGroup?.rxnormId?.[0] ?? null;
  } catch { return null; }
}
async function rxFromText(text: string) {
  const words: string[] = text.split(/[^A-Za-z0-9-]+/).filter((w: string) => w.length > 2);
  const cleaned: string[] = words.map(cleanToken).filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i < cleaned.length; i++) {
    grams.add(cleaned[i]);
    if (i + 1 < cleaned.length) grams.add(`${cleaned[i]} ${cleaned[i + 1]}`);
    if (i + 2 < cleaned.length) grams.add(`${cleaned[i]} ${cleaned[i + 1]} ${cleaned[i + 2]}`);
  }
  const tokens = Array.from(grams).slice(0, 200);
  const found: Array<{ token: string; rxcui: string }> = [];
  for (const token of tokens) {
    const r = await rxcuiForName(token);
    if (r) found.push({ token, rxcui: r });
  }
  // dedupe by rxcui
  const meds = Object.values(found.reduce<Record<string, { token: string; rxcui: string }>>((acc, m) => {
    if (!acc[m.rxcui]) acc[m.rxcui] = m;
    return acc;
  }, {}));
  return meds;
}

// --------- Route ----------
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData().catch((e:any)=>{ throw new Error('Bad form-data: ' + (e?.message||e)); });
    const file = form.get('file') as File | null;
    if (!file) return json({ ok:false, error:'No file' }, 400);

    const type = (file.type || '').toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());

    let text = '';
    let usedOCR = false;

    if (type === 'application/pdf') {
      // 1) Try PDF text layer first
      try {
        const res = await extractTextFromPDF(buf);
        text = (res?.text || '').trim();
        // If your extractTextFromPDF also sets res.ocr, you can read it here.
      } catch (e:any) {
        // If PDF.js fails, continue to OCR fallback (if available)
        // console.error('PDF.js failed:', e);
      }

      // 2) OCR fallback for scanned PDFs
      if (!text || text.length < 8) {
        try {
          const o = await ocrBuffer(buf);
          text = (o?.text || '').trim();
          usedOCR = !!o?.usedOCR || true;
        } catch {
          // If OCR fails, treat as unreadable text rather than hard error
          usedOCR = true;
          text = '';
        }
      }
    } else if (type.startsWith('image/')) {
      // Image → OCR only
      try {
        const o = await ocrBuffer(buf);
        text = (o?.text || '').trim();
        usedOCR = !!o?.usedOCR || true;
      } catch {
        // Swallow OCR errors and fall through to empty-text response
        usedOCR = true;
        text = '';
      }
    } else {
      return json({ ok:false, error:`Unsupported file type: ${type || 'unknown'}` }, 415);
    }

    if (!text || text.length < 8) {
      return json({ ok:true, detectedType:'other', usedOCR, preview:'', note:'No readable text found.' }, 200);
    }

    // 3) Detect + analyze
    let detectedType: DetectedType = 'other';
    if (looksLikeBlood(text)) detectedType = 'blood';
    else if (looksLikeRx(text)) detectedType = 'prescription';

    const payload: any = { ok:true, detectedType, usedOCR };

    if (detectedType === 'blood') {
      const values = labMap(labCandidates(text));
      payload.values = values;
      payload.summary = labSummary(values);
      payload.disclaimer = 'Automated summary for education only; not medical advice.';
    } else if (detectedType === 'prescription') {
      payload.meds = await rxFromText(text);
      if (!payload.meds.length) payload.note = 'No clear medicines detected.';
    } else {
      payload.preview = text.slice(0, 3000); // show more preview for debugging
    }

    // 4) Optional LLM summary on full text
    if (process.env.LLM_BASE_URL && process.env.LLM_API_KEY && process.env.LLM_MODEL_ID) {
      const chunks = chunkText(text);
      const systemPrompt = `
You are a clinical assistant. Given the FULL text of a medical PDF, produce a concise, patient-safe summary:
- Patient identifiers (if present).
- Key sections.
- Abnormal values: test – value (reference) – low/normal/high.
- 2–5 key findings (cautious language).
- 3–6 next steps (always include “Discuss with your clinician.”).
Keep ≤ ~250 words.
      `.trim();
      try {
        const s = await summarizeChunks(chunks, systemPrompt);
        if (s && s.trim()) payload.doctorStyleSummary = s.trim();
      } catch {
        // swallow LLM errors; payload remains valid
      }
    }

    return json(payload, 200);
  } catch (e:any) {
    return json({ ok:false, error:String(e?.message||e) }, 500);
  }
}
