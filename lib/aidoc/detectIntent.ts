// lib/aidoc/detectIntent.ts
// Zero-dependency, fast intent + entity detection for AiDoc.
// Works with the huge taxonomy in lib/aidoc/intents.ts.
// Exposes: detectIntent(query), detectIntentAndEntities(query)
//
// Entities we extract today (lightweight):
//  - metric (LDL, HbA1c, ALT, etc., with aliases)
//  - date mentions (YYYY-MM-DD, DD/MM/YYYY, "May 2025", etc.)
//  - compare windows (two dates -> for compare_reports)
//
// Internals:
//  - Normalization (lowercase, ascii-ish, whitespace collapse)
//  - Token overlap scoring (Jaccard) against category phrases
//  - Fast substring pass first; overlap scoring as fallback
//  - Category prioritization so obvious buckets win
//
// You can swap this later for embeddings or a vector index
// without changing your route handler’s call-site.

import { AiDocPrompts, AiDocIntentCategory } from "@/lib/aidoc/intents";

export type DetectedIntent = AiDocIntentCategory;

export type DetectedEntities = {
  metric?: string | null;
  metricAlias?: string | null;
  dates?: string[];
  compareWindow?: { a: string; b: string } | null;
};

export type DetectResult = {
  intent: DetectedIntent;
  confidence: number;
  entities: DetectedEntities;
};

// ---- Category priority (highest wins on ties) ----
const CATEGORY_PRIORITY: DetectedIntent[] = [
  "compare_reports",
  "compare_metric",
  "pull_reports",
  "health_summary",
  "interpret_report",
  "medications",
  "conditions",
  "vitals",
  "imaging",
  "lifestyle",
  "tips",
];

// ---- Normalization helpers ----
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9\s:/\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter(t => sb.has(t)).length;
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
}

// ---- Metric aliases ----
const METRIC_ALIASES: Record<string, string[]> = {
  LDL: ["ldl", "bad cholesterol", "low density lipoprotein"],
  HDL: ["hdl", "good cholesterol", "high density lipoprotein"],
  "Total Cholesterol": ["total cholesterol", "tc"],
  Triglycerides: ["triglycerides", "tg"],
  HbA1c: ["hba1c", "a1c", "glycated hemoglobin", "glycosylated hemoglobin"],
  "Fasting Glucose": ["fasting glucose", "fbg", "fasting sugar", "fasting blood sugar"],
  Creatinine: ["creatinine"],
  eGFR: ["egfr", "estimated gfr", "glomerular filtration"],
  ALT: ["alt", "sgpt"],
  AST: ["ast", "sgot"],
  ALP: ["alp", "alkaline phosphatase"],
  Bilirubin: ["bilirubin", "tbl", "total bilirubin"],
  GGT: ["ggt", "gamma gt"],
  TSH: ["tsh"],
  T3: ["t3"],
  T4: ["t4", "thyroxine"],
  "Vitamin D": ["vitamin d", "25-oh d", "25 hydroxy vitamin d"],
  "Vitamin B12": ["vitamin b12", "b12", "cobalamin"],
  CRP: ["crp", "c reactive protein"],
  "Uric Acid": ["uric acid"],
  Hemoglobin: ["hemoglobin", "hb"],
  WBC: ["wbc", "white cell", "white blood cell"],
  Platelets: ["platelets", "plt"],
  MCV: ["mcv", "mean corpuscular volume"],
};

const ALIAS_TO_METRIC: Record<string, { canonical: string; alias: string }> = (() => {
  const map: Record<string, { canonical: string; alias: string }> = {};
  for (const [canonical, aliases] of Object.entries(METRIC_ALIASES)) {
    for (const a of aliases) {
      map[normalize(a)] = { canonical, alias: a };
    }
  }
  return map;
})();

// ---- Date detection (simple but covers common forms) ----
const DATE_REGEX =
  /\b(?:\d{4}[\/-]\d{1,2}(?:[\/-]\d{1,2})?|\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+\d{4})\b/gi;

function extractDates(q: string): string[] {
  const raw = q.match(DATE_REGEX) || [];
  return raw.map(s => s.trim());
}

function extractCompareWindow(dates: string[]): { a: string; b: string } | null {
  if (dates.length >= 2) return { a: dates[0], b: dates[1] };
  return null;
}

function extractMetric(q: string): { metric?: string; metricAlias?: string } {
  const nq = normalize(q);
  for (const key of Object.keys(ALIAS_TO_METRIC)) {
    if (nq.includes(key)) {
      const { canonical, alias } = ALIAS_TO_METRIC[key];
      return { metric: canonical, metricAlias: alias };
    }
  }
  for (const [canonical, aliases] of Object.entries(METRIC_ALIASES)) {
    const names = [canonical, ...aliases].map(normalize);
    const qTokens = tokens(q);
    if (qTokens.some(t => names.includes(t))) {
      return { metric: canonical, metricAlias: canonical };
    }
  }
  return {};
}

// ---- Build a quick index for fast substring checks ----
type IndexRow = { phrase: string; cat: DetectedIntent; toks: string[] };
const INDEX: IndexRow[] = (() => {
  const rows: IndexRow[] = [];
  for (const [cat, phrases] of Object.entries(AiDocPrompts)) {
    for (const p of phrases) {
      const phrase = normalize(p);
      rows.push({ phrase, cat: cat as DetectedIntent, toks: tokens(phrase) });
    }
  }
  return rows;
})();

// ---- Core detection ----
export function detectIntent(query: string): DetectedIntent {
  return detectIntentAndEntities(query).intent;
}

export function detectIntentAndEntities(query: string): DetectResult {
  const qNorm = normalize(query);
  const qToks = tokens(qNorm);

  let best: { cat: DetectedIntent; score: number } | null = null;
  for (const row of INDEX) {
    if (!row.phrase) continue;
    if (qNorm.includes(row.phrase)) {
      const score = Math.min(1, row.phrase.length / Math.max(8, qNorm.length));
      if (!best || score > best.score || (score === best.score && tieBreak(row.cat, best.cat))) {
        best = { cat: row.cat, score };
      }
    }
  }

  let bestOverlap: { cat: DetectedIntent; score: number } | null = null;
  for (const row of INDEX) {
    const s = jaccard(qToks, row.toks);
    if (!bestOverlap || s > bestOverlap.score || (s === bestOverlap.score && tieBreak(row.cat, bestOverlap.cat))) {
      bestOverlap = { cat: row.cat, score: s };
    }
  }

  let winner: { cat: DetectedIntent; score: number } =
    best && best.score >= 0.2 ? best : (bestOverlap as any) || { cat: "pull_reports", score: 0.15 };

  const metricEnt = extractMetric(query);
  const dates = extractDates(query);
  const compareWindow = extractCompareWindow(dates);

  if (metricEnt.metric && winner.cat !== "pull_reports") {
    winner = { cat: "compare_metric", score: Math.max(winner.score, 0.6) };
  }
  if (/\bcompare\b|\bvs\b|\bversus\b/.test(qNorm) && compareWindow) {
    winner = { cat: "compare_reports", score: Math.max(winner.score, 0.7) };
  }
  if (/^how is my health\b|overall health summary|holistic|health overview/.test(qNorm)) {
    winner = { cat: "health_summary", score: Math.max(winner.score, 0.65) };
  }
  if (/\bx[-\s]?ray\b|\bmri\b|\bct\b|\busg\b|\bultrasound\b|\becho(cardio)?\b|\bbiopsy\b|\bcolonoscopy\b/.test(qNorm)) {
    winner = { cat: "interpret_report", score: Math.max(winner.score, 0.7) };
  }

  return {
    intent: winner.cat,
    confidence: Math.max(0, Math.min(1, winner.score)),
    entities: {
      metric: metricEnt.metric || null,
      metricAlias: metricEnt.metricAlias || null,
      dates,
      compareWindow: compareWindow || null,
    },
  };
}

function tieBreak(a: DetectedIntent, b: DetectedIntent): boolean {
  const pa = CATEGORY_PRIORITY.indexOf(a);
  const pb = CATEGORY_PRIORITY.indexOf(b);
  return pa >= 0 && pb >= 0 ? pa < pb : true;
}
