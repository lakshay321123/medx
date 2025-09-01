export type Patient = { name: string | null; age: number | null; sex: string | null };

export type Measurement = {
  test: string;
  canonical: string;
  value: number | string;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  sourceText: string;
  system: SystemName;
};

export type SystemName =
  | 'hepatic'
  | 'renal'
  | 'lipid'
  | 'glucose'
  | 'thyroid'
  | 'hematology'
  | 'inflammation'
  | 'electrolytes'
  | 'vitaminsHormones'
  | 'other';

type PatientHints = { name?: string; age?: number; sex?: string };

type RawRow = {
  test: string;
  value: string;
  unit: string | null;
  ref: string | null;
  sourceText: string;
};

const CANONICAL_MAP: Record<string, { canonical: string; system: SystemName }> = {
  sgpt: { canonical: 'ALT', system: 'hepatic' },
  alt: { canonical: 'ALT', system: 'hepatic' },
  alanineaminotransferase: { canonical: 'ALT', system: 'hepatic' },
  sgot: { canonical: 'AST', system: 'hepatic' },
  ast: { canonical: 'AST', system: 'hepatic' },
  aspartataminotransferase: { canonical: 'AST', system: 'hepatic' },
  tbilirubin: { canonical: 'Bilirubin', system: 'hepatic' },
  bilirubin: { canonical: 'Bilirubin', system: 'hepatic' },
  alkalinephosphatase: { canonical: 'ALP', system: 'hepatic' },
  ldl: { canonical: 'LDL', system: 'lipid' },
  hdl: { canonical: 'HDL', system: 'lipid' },
  tc: { canonical: 'TC', system: 'lipid' },
  tchol: { canonical: 'TC', system: 'lipid' },
  cholesterol: { canonical: 'TC', system: 'lipid' },
  triglycerides: { canonical: 'TG', system: 'lipid' },
  tg: { canonical: 'TG', system: 'lipid' },
  hba1c: { canonical: 'HbA1c', system: 'glucose' },
  glucose: { canonical: 'Glucose', system: 'glucose' },
  creatinine: { canonical: 'Creatinine', system: 'renal' },
  egfr: { canonical: 'eGFR', system: 'renal' },
  tsh: { canonical: 'TSH', system: 'thyroid' },
  t3: { canonical: 'T3', system: 'thyroid' },
  t4: { canonical: 'T4', system: 'thyroid' },
  hemoglobin: { canonical: 'Hemoglobin', system: 'hematology' },
  hb: { canonical: 'Hemoglobin', system: 'hematology' },
  wbc: { canonical: 'WBC', system: 'hematology' },
  rbc: { canonical: 'RBC', system: 'hematology' },
  platelet: { canonical: 'Platelet', system: 'hematology' },
  platelets: { canonical: 'Platelet', system: 'hematology' },
  esr: { canonical: 'ESR', system: 'inflammation' },
  crp: { canonical: 'CRP', system: 'inflammation' },
  potassium: { canonical: 'Potassium', system: 'electrolytes' },
  sodium: { canonical: 'Sodium', system: 'electrolytes' },
  vitamind: { canonical: 'Vitamin D', system: 'vitaminsHormones' },
  vitdb3: { canonical: 'Vitamin D', system: 'vitaminsHormones' },
  vitaminb12: { canonical: 'Vitamin B12', system: 'vitaminsHormones' },
};

const DEFAULT_RANGES: Record<string, { low: number | null; high: number | null }> = {
  ALT: { low: 0, high: 35 },
  AST: { low: 0, high: 35 },
  Bilirubin: { low: 0.1, high: 1.2 },
  ALP: { low: 44, high: 147 },
  LDL: { low: 0, high: 129 },
  HDL: { low: 40, high: 100 },
  TC: { low: 0, high: 199 },
  TG: { low: 0, high: 150 },
  HbA1c: { low: 4, high: 5.6 },
  Glucose: { low: 70, high: 100 },
  Creatinine: { low: 0.6, high: 1.3 },
  eGFR: { low: 60, high: null },
  TSH: { low: 0.4, high: 4.5 },
  T3: { low: 80, high: 200 },
  T4: { low: 5, high: 12 },
  Hemoglobin: { low: 12, high: 17.5 },
  WBC: { low: 4, high: 11 },
  RBC: { low: 4, high: 6 },
  Platelet: { low: 150, high: 450 },
  ESR: { low: 0, high: 20 },
  CRP: { low: 0, high: 10 },
  Potassium: { low: 3.5, high: 5.1 },
  Sodium: { low: 135, high: 145 },
  'Vitamin D': { low: 30, high: 100 },
  'Vitamin B12': { low: 200, high: 900 },
};

function normKey(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function canonicalize(name: string) {
  const k = normKey(name);
  return CANONICAL_MAP[k]?.canonical || name.trim();
}

function systemFor(canonical: string): SystemName {
  const k = normKey(canonical);
  return CANONICAL_MAP[k]?.system || 'other';
}

function splitByHeadings(text: string): Record<string, string[]> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const sections: Record<string, string[]> = {};
  let current = 'general';
  sections[current] = [];
  for (const line of lines) {
    const isHeading = /[A-Z]/.test(line) && line === line.toUpperCase() && line.length < 80;
    if (isHeading) {
      current = line.replace(/\s+/g, ' ').trim();
      sections[current] = [];
    } else {
      sections[current].push(line);
    }
  }
  return sections;
}

function extractRows(sections: Record<string, string[]>): RawRow[] {
  const rows: RawRow[] = [];
  for (const secLines of Object.values(sections)) {
    for (const line of secLines) {
      const m = line.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)\s*([A-Za-zµ/%]+)?\s*(.*)$/);
      if (!m) continue;
      rows.push({
        test: m[1].replace(/:$/, '').trim(),
        value: m[2],
        unit: m[3] || null,
        ref: m[4] || null,
        sourceText: line,
      });
    }
  }
  return rows;
}

function parseRange(raw: string): { low: number | null; high: number | null } {
  const rangeMatch = raw.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return { low: parseFloat(rangeMatch[1]), high: parseFloat(rangeMatch[2]) };
  }
  const lt = raw.match(/<\s*(\d+(?:\.\d+)?)/);
  if (lt) return { low: null, high: parseFloat(lt[1]) };
  const gt = raw.match(/>\s*(\d+(?:\.\d+)?)/);
  if (gt) return { low: parseFloat(gt[1]), high: null };
  return { low: null, high: null };
}

function flagValue(
  canonical: string,
  value: number,
  refLow: number | null,
  refHigh: number | null
): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
  let flag: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL';
  if (refLow != null && value < refLow) flag = 'LOW';
  if (refHigh != null && value > refHigh) flag = 'HIGH';
  if (canonical === 'ALT' && value >= 200) flag = 'CRITICAL';
  if (canonical === 'AST' && value >= 200) flag = 'CRITICAL';
  if (canonical === 'LDL' && value >= 190) flag = 'CRITICAL';
  if (canonical === 'ESR' && value >= 100) flag = 'CRITICAL';
  if (canonical === 'Bilirubin' && value > 2.5) flag = 'CRITICAL';
  if (canonical === 'Potassium' && (value < 3 || value > 6)) flag = 'CRITICAL';
  return flag;
}

function normalize(rows: RawRow[]): Measurement[] {
  const items: Measurement[] = [];
  for (const r of rows) {
    const canonical = canonicalize(r.test);
    const { low, high } = parseRange(r.ref || '');
    const def = DEFAULT_RANGES[canonical];
    const refLow = low != null ? low : def?.low ?? null;
    const refHigh = high != null ? high : def?.high ?? null;
    const num = parseFloat(r.value);
    const value = Number.isFinite(num) ? num : r.value;
    const flag = Number.isFinite(num)
      ? flagValue(canonical, num, refLow, refHigh)
      : 'UNKNOWN';
    items.push({
      test: r.test,
      canonical,
      value,
      unit: r.unit,
      refLow,
      refHigh,
      flag,
      sourceText: r.sourceText,
      system: systemFor(canonical),
    });
  }
  return items;
}

type Systems = Record<SystemName, { items: Measurement[]; summary: string }>;

function initSystems(): Systems {
  return {
    hepatic: { items: [], summary: '' },
    renal: { items: [], summary: '' },
    lipid: { items: [], summary: '' },
    glucose: { items: [], summary: '' },
    thyroid: { items: [], summary: '' },
    hematology: { items: [], summary: '' },
    inflammation: { items: [], summary: '' },
    electrolytes: { items: [], summary: '' },
    vitaminsHormones: { items: [], summary: '' },
    other: { items: [], summary: '' },
  };
}

function systemSummary(items: Measurement[]): string {
  if (!items.length) return 'No data.';
  const highs = items
    .filter(i => i.flag === 'HIGH' || i.flag === 'CRITICAL')
    .map(i => i.canonical);
  const lows = items.filter(i => i.flag === 'LOW').map(i => i.canonical);
  if (!highs.length && !lows.length) return 'All values within reference ranges.';
  const parts: string[] = [];
  if (highs.length) parts.push(`Elevated: ${highs.join(', ')}`);
  if (lows.length) parts.push(`Low: ${lows.join(', ')}`);
  return parts.join('. ');
}

function groupBySystem(items: Measurement[]): Systems {
  const systems = initSystems();
  for (const m of items) systems[m.system].items.push(m);
  for (const k of Object.keys(systems) as SystemName[]) {
    systems[k].summary = systemSummary(systems[k].items);
  }
  return systems;
}

function tryExtractPatient(text: string, hints?: PatientHints): Patient {
  const nameMatch = text.match(/Name\s*[:\-]\s*([A-Za-z ]{2,})/i);
  const ageMatch = text.match(/Age\s*[:\-]\s*(\d{1,3})/i);
  const sexMatch = text.match(/(?:Sex|Gender)\s*[:\-]\s*(Male|Female|M|F)/i);
  return {
    name: hints?.name || nameMatch?.[1]?.trim() || null,
    age: hints?.age ?? (ageMatch ? parseInt(ageMatch[1], 10) : null),
    sex:
      hints?.sex ||
      (sexMatch ? (sexMatch[1].toUpperCase().startsWith('M') ? 'M' : 'F') : null),
  };
}

export function analyzeLabText(text: string, patientHints?: PatientHints) {
  const sections = splitByHeadings(text);
  const rows = extractRows(sections);
  const measurements = normalize(rows);
  const systems = groupBySystem(measurements);

  const abnormal = measurements.filter(
    m => m.flag !== 'NORMAL' && m.flag !== 'UNKNOWN'
  );
  const overallHealth = abnormal.length
    ? abnormal.some(m => m.flag === 'CRITICAL')
      ? 'Severe abnormalities detected.'
      : 'Some results are outside typical ranges.'
    : 'All parsed values are within reference ranges.';
  const keyFindings = abnormal.map(
    m => `${m.canonical} ${m.value}${m.unit ? ' ' + m.unit : ''} (${m.flag})`
  );
  const suggestions = abnormal.length
    ? ['Follow up with your healthcare provider.', 'Discuss lifestyle and treatment options.']
    : ['Maintain routine check-ups.'];

  const interpretations: Record<SystemName, string> = {
    hepatic: systems.hepatic.summary,
    renal: systems.renal.summary,
    lipid: systems.lipid.summary,
    glucose: systems.glucose.summary,
    thyroid: systems.thyroid.summary,
    hematology: systems.hematology.summary,
    inflammation: systems.inflammation.summary,
    electrolytes: systems.electrolytes.summary,
    vitaminsHormones: systems.vitaminsHormones.summary,
    other: systems.other.summary,
  };
  const redFlags = measurements
    .filter(m => m.flag === 'CRITICAL')
    .map(m => `${m.canonical} ${m.value}${m.unit ? ' ' + m.unit : ''}`);

  return {
    patient: tryExtractPatient(text, patientHints),
    reportType: measurements.length ? 'lab' : 'other',
    systems,
    measurements,
    generalSummary: {
      overallHealth,
      keyFindings,
      suggestions,
    },
    doctorAnalysis: {
      interpretations,
      redFlags,
    },
  };
}

export const DISCLAIMER = 'Automated summary for educational use only.';
