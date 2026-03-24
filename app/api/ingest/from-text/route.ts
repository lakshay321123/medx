export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractReportDate } from "@/lib/reportDate";
import { summarizeMedicalDoc } from "@/lib/summarizeDoc";
import { buildShortSummaryFromText } from "@/lib/shortSummary";
import OpenAI from "openai";

const HAVE_OPENAI = !!process.env.OPENAI_API_KEY;
const openai = HAVE_OPENAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }) : null;

const STOPWORDS = [
  "PHYSICAL EXAMINATION",
  "VISUAL EXAMINATION",
  "QUANTITY",
  "SPECIMEN",
  "DEPARTMENT",
  "INVESTIGATION",
  "REMARK",
  "REFERENCE INTERVAL",
  "OBSERVED VALUE",
  "UNIT",
  "BIOLOGICAL",
];
const cues = /(mg|mcg|µg|g|iu|ml|tablet|tab|capsule|cap|syrup|injection|drop|ointment|cream|patch)\b/i;
const looksLikeMed = (s: string) =>
  /[A-Za-z]/.test(s) &&
  /\d/.test(s) &&
  cues.test(s) &&
  !STOPWORDS.some((w) => s.toUpperCase().includes(w));

function extractMedsFromText(text: string) {
  const raw = text
    .split(/\n|,|;/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const meds = raw.filter(looksLikeMed);
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const m of meds) {
    const k = m.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(m);
    }
    if (uniq.length >= 20) break;
  }
  return uniq;
}

type OutObs = {
  kind: string;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  observed_at?: string | null;
  meta?: Record<string, any> | null;
};

function crudeRegexExtract(text: string): OutObs[] {
  // Regex fallback for when OpenAI is unavailable — covers 25+ common biomarkers
  const items: OutObs[] = [];
  const add = (kind: string, value_num: number, unit: string, refLow?: number, refHigh?: number) =>
    items.push({
      kind, value_text: null, value_num, unit,
      meta: { category: "lab", ...(refLow != null ? { ref_low: refLow } : {}), ...(refHigh != null ? { ref_high: refHigh } : {}) },
    });

  const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : NaN; };
  const tryMatch = (pattern: RegExp, kind: string, unit: string, group = 1, refLow?: number, refHigh?: number) => {
    const m = text.match(pattern);
    if (m) { const v = num(m[group]); if (!isNaN(v)) add(kind, v, unit, refLow, refHigh); }
  };

  // CBC
  tryMatch(/hemoglobin[^0-9]*([\d.]+)/i, "hemoglobin", "g/dL", 1, 12.0, 17.5);
  tryMatch(/\bWBC[^0-9]*([\d.]+)/i, "wbc", "x10³/µL", 1, 4.0, 11.0);
  tryMatch(/\bRBC[^0-9]*([\d.]+)/i, "rbc", "x10⁶/µL", 1, 4.2, 5.9);
  tryMatch(/platelet[s]?[^0-9]*([\d.]+)/i, "platelets", "x10³/µL", 1, 150, 400);
  tryMatch(/\bMCV[^0-9]*([\d.]+)/i, "mcv", "fL", 1, 80, 100);
  tryMatch(/hematocrit[^0-9]*([\d.]+)/i, "hematocrit", "%", 1, 36, 52);

  // Metabolic
  tryMatch(/\b(HbA1c|HBA1C|glycated)[^0-9]*([\d.]+)/i, "HBA1C", "%", 2, 4.0, 5.6);
  tryMatch(/fasting.*glucose[^0-9]*([\d.]+)|glucose.*fasting[^0-9]*([\d.]+)/i, "fasting_glucose", "mg/dL", 1, 70, 100);
  tryMatch(/\bcreatinine[^0-9]*([\d.]+)/i, "creatinine", "mg/dL", 1, 0.6, 1.2);
  tryMatch(/\begfr[^0-9]*([\d.]+)/i, "EGFR", "mL/min/1.73m²", 1, 90);
  tryMatch(/\burea[^0-9]*([\d.]+)|\bBUN[^0-9]*([\d.]+)/i, "bun", "mg/dL", 1, 7, 20);
  tryMatch(/uric\s*acid[^0-9]*([\d.]+)/i, "uric_acid", "mg/dL", 1, 3.5, 7.2);

  // Lipid panel
  tryMatch(/total\s*cholesterol[^0-9]*([\d.]+)/i, "total_cholesterol", "mg/dL", 1, undefined, 200);
  tryMatch(/\bLDL[^0-9]*([\d.]+)/i, "LDL-C", "mg/dL", 1, undefined, 100);
  tryMatch(/\bHDL[^0-9]*([\d.]+)/i, "HDL-C", "mg/dL", 1, 40);
  tryMatch(/triglyceride[s]?[^0-9]*([\d.]+)/i, "triglycerides", "mg/dL", 1, undefined, 150);

  // Liver
  tryMatch(/\bALT[^0-9]*([\d.]+)/i, "alt", "U/L", 1, 7, 56);
  tryMatch(/\bAST[^0-9]*([\d.]+)/i, "ast", "U/L", 1, 10, 40);
  tryMatch(/\bALP[^0-9]*([\d.]+)|alkaline\s*phosphatase[^0-9]*([\d.]+)/i, "alp", "U/L", 1, 44, 147);
  tryMatch(/bilirubin.*total[^0-9]*([\d.]+)|total.*bilirubin[^0-9]*([\d.]+)/i, "bilirubin_total", "mg/dL", 1, 0.1, 1.2);
  tryMatch(/albumin[^0-9]*([\d.]+)/i, "albumin", "g/dL", 1, 3.5, 5.5);

  // Thyroid
  tryMatch(/\bTSH[^0-9]*([\d.]+)/i, "tsh", "mIU/L", 1, 0.4, 4.0);
  tryMatch(/\bT3[^0-9]*([\d.]+)/i, "t3", "ng/dL", 1, 80, 200);
  tryMatch(/\bT4[^0-9]*([\d.]+)|thyroxine[^0-9]*([\d.]+)/i, "t4", "µg/dL", 1, 4.5, 12.0);

  // Inflammatory
  tryMatch(/\bCRP[^0-9]*([\d.]+)/i, "crp", "mg/L", 1, undefined, 3.0);
  tryMatch(/\bESR[^0-9]*([\d.]+)/i, "esr", "mm/hr", 1, undefined, 20);

  // Vitamins / Minerals
  tryMatch(/vitamin\s*D[^0-9]*([\d.]+)/i, "vitamin_d", "ng/mL", 1, 30, 100);
  tryMatch(/vitamin\s*B12[^0-9]*([\d.]+)/i, "vitamin_b12", "pg/mL", 1, 200, 900);
  tryMatch(/ferritin[^0-9]*([\d.]+)/i, "ferritin", "ng/mL", 1, 12, 300);
  tryMatch(/iron[^0-9]*([\d.]+)/i, "iron", "µg/dL", 1, 60, 170);

  // Imaging fallback
  const mri = text.match(/\bMRI\b.*?(normal|unremarkable|no (significant )?abnormalit(y|ies))/i);
  if (mri) items.push({ kind: "mri_report", value_text: mri[0].slice(0, 160), meta: { category: "imaging", modality: "MRI" } });

  const rx = text.match(/\b(Rx|Prescription|Take)\b.*?$/im);
  if (rx) items.push({ kind: "medication_note", value_text: rx[0].slice(0, 160), meta: { category: "medication" } });

  if (items.length === 0) {
    items.push({ kind: "document_note", value_text: text.slice(0, 160), meta: { category: "note" } });
  }
  return items;
}
function extractPatientFields(text: string) {
  const name = text.match(/(?:patient|name)[:\s]+([A-Z][A-Za-z\s]+)/i)?.[1]?.trim();
  const age = text.match(/(?:age)[:\s]+(\d{1,3})/i)?.[1];
  const sex = text.match(/\b(male|female|man|woman)\b/i)?.[1]?.toLowerCase();
  const blood = text.match(/blood\s*group[:\s]+([A-Z][+-]?)/i)?.[1];
  return { name, age, sex, blood_group: blood };
}

function deriveTags(text: string, mime?: string): string[] {
  const tags = new Set<string>();
  if (/hba1c|glucose|tsh|egfr|creatinine|ldl|hdl|triglycer|cholesterol|crp|esr|vitamin d/i.test(text))
    tags.add('lab');
  if (/prescription|rx|tablet|dose|mg|ml|medication/i.test(text)) tags.add('prescription');
  if (/x-ray|xray|ct|mri|scan|ultra\s?sound|usg/i.test(text)) tags.add('imaging');
  if (mime && /^image\//.test(mime)) tags.add('image');
  return Array.from(tags);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { threadId, text, defaults, sourceHash } = await req.json().catch(() => ({}));
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  let items: OutObs[] = [];
  let usedFallback = false;

  if (HAVE_OPENAI) {
    try {
      const system = `Extract clinical observations from arbitrary medical documents.
Return JSON { "items": OutObs[] } only. Fields:
kind (snake_case), value_num, value_text, unit, observed_at (ISO|null),
meta.category in {lab|vital|imaging|medication|diagnosis|procedure|immunization|note|other}, meta.modality/meta.source_type if known.`;
      const user = `Document text:\n"""${text.slice(0, 100000)}"""`;

      const resp = await openai!.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });

      const parsed = JSON.parse(resp.choices[0]?.message?.content || "{}");
      items = Array.isArray(parsed.items) ? parsed.items : [];
    } catch (e) {
      console.error("LLM extraction failed, using fallback:", e);
      usedFallback = true;
      items = crudeRegexExtract(text);
    }
  } else {
    usedFallback = true;
    items = crudeRegexExtract(text);
  }

  if (!items.length) {
    items = [{ kind: "document_note", value_text: text.slice(0, 160), meta: { category: "note" } }];
  }

  const nowISO = new Date().toISOString();
  const reportDate = extractReportDate(text || defaults?.meta?.text || "") || null;
  const sb = supabaseAdmin();

  // Idempotency by sourceHash (optional)
  if (sourceHash) {
    await sb
      .from("observations")
      .delete()
      .eq("user_id", userId)
      .eq("thread_id", threadId ?? null)
      .eq("meta->>source_hash", sourceHash);
  }

  const summaryLong = text && text.length > 2000 ? summarizeMedicalDoc(text) : undefined;
  const summaryShort = buildShortSummaryFromText(text, summaryLong);
  const meds = extractMedsFromText(text);
  const patient = extractPatientFields(text);
  const tags = deriveTags(text, defaults?.meta?.mime);

  const rows = items.map((x) => ({
    user_id: userId,
    thread_id: threadId ?? null,
    kind: String(x.kind || 'unknown').toLowerCase(),
    value_num: x.value_num ?? null,
    value_text: x.value_text ?? null,
    unit: x.unit ?? null,
    observed_at:
      reportDate ||
      defaults?.measuredAt ||
      defaults?.details?.observed_at ||
      x.observed_at ||
      defaults?.observed_at ||
      nowISO,
    meta: {
      ...(x.meta || {}),
      ...(defaults?.meta || {}),
      report_date: reportDate,
      text,
      summary: summaryShort ?? x.meta?.summary ?? defaults?.meta?.summary,
      summary_long: summaryLong ?? x.meta?.summary_long ?? defaults?.meta?.summary_long,
      tags,
      meds,
      patient_fields: patient,
      committed: threadId === 'med-profile',
      source_type: x.meta?.source_type || defaults?.meta?.source_type || 'text',
      ...(sourceHash ? { source_hash: sourceHash } : {}),
      ...(usedFallback ? { extracted_by: 'fallback' } : {}),
    },
  }));

  const { data: inserted, error } = await sb
    .from("observations")
    .insert(rows)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (inserted || []).map((r: any) => r.id);

  // Also populate observation_labs for structured lab values (feeds health score)
  const labRows = items
    .map((x: any, originalIdx: number) => ({ x, originalIdx }))
    .filter(({ x }) => x.value_num != null && x.kind && x.meta?.category === "lab")
    .map(({ x, originalIdx }) => ({
      user_id: userId,
      observation_id: ids[originalIdx] || ids[0],
      sample_date: reportDate || nowISO,
      test_code: String(x.kind || "").toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
      test_name: String(x.kind || "").replace(/_/g, " "),
      value: x.value_num,
      unit: x.unit || null,
      ref_low: x.meta?.ref_low ?? null,
      ref_high: x.meta?.ref_high ?? null,
    }))
    .filter((r: any) => r.test_code && r.value != null);

  if (labRows.length > 0) {
    await sb.from("observation_labs").insert(labRows).select("id");
  }

  return NextResponse.json({ ok: true, ids, inserted: ids.length, labs: labRows.length, usedFallback });
}
