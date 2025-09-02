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

export function reduceChunks(chunks: DataSet[]): DataSet {
  const out = emptyData();
  for (const c of chunks) {
    out.labs.push(...(c.labs || []));
    out.medications.push(...(c.medications || []));
    out.diagnoses.push(...(c.diagnoses || []));
    out.impressions.push(...(c.impressions || []));
    out.red_flags.push(...(c.red_flags || []));
    out.followups.push(...(c.followups || []));
  }
  return out;
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
