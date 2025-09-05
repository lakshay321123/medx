export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractReportDate } from "@/lib/reportDate";
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
  // Very simple regex fallbacks so something gets stored immediately
  // Extend as you like; safe and deterministic.
  const items: OutObs[] = [];
  const add = (kind: string, value_text: string | null, value_num?: number | null, unit?: string | null) =>
    items.push({ kind, value_text, value_num: value_num ?? null, unit: unit ?? null, meta: { category: "lab" } });

  const num = (s: string) => (s ? parseFloat(s) : NaN);

  const hb = text.match(/hemoglobin[^0-9]*([\d.]+)/i);
  if (hb) add("hemoglobin", null, num(hb[1]), "g/dL");

  const alt = text.match(/\bALT[^0-9]*([\d.]+)/i);
  if (alt) add("alt", null, num(alt[1]), "U/L");

  const ast = text.match(/\bAST[^0-9]*([\d.]+)/i);
  if (ast) add("ast", null, num(ast[1]), "U/L");

  const hba1c = text.match(/\b(HbA1c|HBA1C)[^0-9]*([\d.]+)/i);
  if (hba1c) add("hba1c", null, num(hba1c[2]), "%");

  const egfr = text.match(/\begfr[^0-9]*([\d.]+)/i);
  if (egfr) add("egfr", null, num(egfr[1]), "mL/min/1.73m²");

  const mri = text.match(/\bMRI\b.*?(normal|unremarkable|no (significant )?abnormalit(y|ies))/i);
  if (mri) items.push({ kind: "mri_report", value_text: mri[0].slice(0, 160), meta: { category: "imaging", modality: "MRI" } });

  const rx = text.match(/\b(Rx|Prescription|Take)\b.*?$/im);
  if (rx) items.push({ kind: "medication_note", value_text: rx[0].slice(0, 160), meta: { category: "medication" } });

  if (items.length === 0) {
    items.push({ kind: "document_note", value_text: text.slice(0, 160), meta: { category: "note" } });
  }
  return items;
}

function summarizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .slice(0, 3)
    .join(' ')
    .slice(0, 500);
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

  const summary = summarizeText(text);
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
      summary,
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
  return NextResponse.json({ ok: true, ids, inserted: ids.length, usedFallback });
}
