import { askGroq, askOpenAI } from './llm';

export interface Lab {
  name: string;
  value?: string;
  units?: string;
  ref_low?: string;
  ref_high?: string;
  flag?: string;
  page_range?: string;
  [k: string]: any;
}

export interface Medication {
  drug: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  page_range?: string;
  [k: string]: any;
}

export interface Named {
  name: string;
  page_range?: string;
  [k: string]: any;
}

export interface TextEntry {
  text: string;
  page_range?: string;
  [k: string]: any;
}

export interface DataSet {
  labs: Lab[];
  medications: Medication[];
  diagnoses: Named[];
  impressions: TextEntry[];
  red_flags: TextEntry[];
  followups: TextEntry[];
}

export function emptyData(): DataSet {
  return { labs: [], medications: [], diagnoses: [], impressions: [], red_flags: [], followups: [] };
}

function mergePageRange(a?: string, b?: string) {
  if (!a) return b;
  if (!b) return a;
  if (a.includes(b)) return a;
  return `${a},${b}`;
}

export function reduceChunks(chunks: DataSet[]): DataSet {
  const labs = new Map<string, Lab>();
  const meds = new Map<string, Medication>();
  const diags = new Map<string, Named>();
  const imps = new Map<string, TextEntry>();
  const reds = new Map<string, TextEntry>();
  const foll = new Map<string, TextEntry>();

  for (const c of chunks) {
    for (const l of c.labs || []) {
      const k = normLabName(l.name);
      const existing = labs.get(k);
      labs.set(k, existing ? { ...existing, ...l, page_range: mergePageRange(existing.page_range, l.page_range) } : { ...l });
    }
    for (const m of c.medications || []) {
      const k = normDrug(m.drug);
      const existing = meds.get(k);
      meds.set(k, existing ? { ...existing, ...m, page_range: mergePageRange(existing.page_range, m.page_range) } : { ...m });
    }
    for (const d of c.diagnoses || []) {
      const k = normText(d.name);
      const existing = diags.get(k);
      diags.set(k, existing ? { ...existing, page_range: mergePageRange(existing.page_range, d.page_range) } : { ...d });
    }
    for (const t of c.impressions || []) {
      const k = normText(t.text);
      const existing = imps.get(k);
      imps.set(k, existing ? { ...existing, page_range: mergePageRange(existing.page_range, t.page_range) } : { ...t });
    }
    for (const t of c.red_flags || []) {
      const k = normText(t.text);
      const existing = reds.get(k);
      reds.set(k, existing ? { ...existing, page_range: mergePageRange(existing.page_range, t.page_range) } : { ...t });
    }
    for (const t of c.followups || []) {
      const k = normText(t.text);
      const existing = foll.get(k);
      foll.set(k, existing ? { ...existing, page_range: mergePageRange(existing.page_range, t.page_range) } : { ...t });
    }
  }

  return {
    labs: [...labs.values()],
    medications: [...meds.values()],
    diagnoses: [...diags.values()],
    impressions: [...imps.values()],
    red_flags: [...reds.values()],
    followups: [...foll.values()],
  };
}

function normLabName(n: string) {
  const k = n.toLowerCase();
  if (k.includes('hba1c') || k.includes('hemoglobin a1c')) return 'HbA1c';
  if (k.includes('ldl')) return 'LDL';
  if (k.includes('tsh')) return 'TSH';
  return n.trim();
}

function normDrug(n: string) {
  return n.toLowerCase().trim();
}

function normText(t: string) {
  return t.toLowerCase().trim();
}

function fuseCategory<T extends { [k: string]: any }>(
  groq: T[],
  openai: T[],
  keyFn: (x: T) => string
) {
  const map = new Map<string, { g?: T; o?: T }>();
  for (const g of groq || []) {
    const k = keyFn(g);
    map.set(k, { ...(map.get(k) || {}), g });
  }
  for (const o of openai || []) {
    const k = keyFn(o);
    map.set(k, { ...(map.get(k) || {}), o });
  }
  const out: any[] = [];
  for (const { g, o } of map.values()) {
    if (g && o) {
      const same = JSON.stringify(g) === JSON.stringify(o);
      if (same) out.push({ ...g, confidence: 1 });
      else {
        out.push({ ...g, source: 'Groq', confidence: -1 });
        out.push({ ...o, source: 'OpenAI', confidence: -1 });
      }
    } else if (g) out.push({ ...g, source: 'Groq', confidence: 0 });
    else if (o) out.push({ ...o, source: 'OpenAI', confidence: 0 });
  }
  return out;
}

export function fuseResults(groq: DataSet, openai: DataSet): DataSet {
  return {
    labs: fuseCategory(groq.labs, openai.labs, (x) => normLabName(x.name)),
    medications: fuseCategory(groq.medications, openai.medications, (x) => normDrug(x.drug)),
    diagnoses: fuseCategory(groq.diagnoses, openai.diagnoses, (x) => normText(x.name)),
    impressions: fuseCategory(groq.impressions, openai.impressions, (x) => normText(x.text)),
    red_flags: fuseCategory(groq.red_flags, openai.red_flags, (x) => normText(x.text)),
    followups: fuseCategory(groq.followups, openai.followups, (x) => normText(x.text)),
  };
}

export function mergeChunks(groqChunks: DataSet[], openaiChunks: DataSet[]): DataSet {
  const g = reduceChunks(groqChunks);
  const o = reduceChunks(openaiChunks);
  return fuseResults(g, o);
}

const DEBUG = process.env.DOC_ENABLE_DEBUG === 'true';

export async function makeSummaries(data: DataSet, mode: 'patient' | 'doctor' | 'both'): Promise<{ patient: string; doctor: string }> {
  const out = { patient: '', doctor: '' };
  const provider = process.env.OPENAI_API_KEY ? askOpenAI : process.env.LLM_API_KEY ? askGroq : null;
  if (!provider) return out;
  const tasks: Promise<void>[] = [];
  if (mode === 'patient' || mode === 'both') {
    tasks.push(
      provider(
        'You are a clinical summarization assistant. Provide 5-8 bullet points in plain language based on this data:',
        JSON.stringify(data)
      )
        .then((res: string) => {
          out.patient = res.trim();
        })
        .catch((e: any) => {
          if (DEBUG) console.error('patient-summary-error', e);
        })
    );
  }
  if (mode === 'doctor' || mode === 'both') {
    tasks.push(
      provider(
        'You are a clinical summarization assistant. Provide 10-14 bullet points with clinical detail based on this data:',
        JSON.stringify(data)
      )
        .then((res: string) => {
          out.doctor = res.trim();
        })
        .catch((e: any) => {
          if (DEBUG) console.error('doctor-summary-error', e);
        })
    );
  }
  await Promise.all(tasks);
  return out;
}
