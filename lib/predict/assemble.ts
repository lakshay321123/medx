import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  PredictionBundle,
  UIObservation,
  UILabValue,
  UIMedication,
  UITextChunk,
  UIProfile,
} from "./types";

const LAB_HINTS = [
  "lab",
  "cbc",
  "lipid",
  "chol",
  "hdl",
  "ldl",
  "triglycer",
  "tg",
  "glucose",
  "hba1c",
  "a1c",
  "egfr",
  "creatinine",
  "bun",
  "vitamin",
  "bilirubin",
  "wbc",
  "rbc",
  "platelet",
  "hemoglobin",
  "hematocrit",
  "ferritin",
  "transferrin",
  "uac",
  "urine",
  "panel",
];

const MED_HINTS = [
  "med",
  "rx",
  "drug",
  "dose",
  "tablet",
  "capsule",
  "injection",
  "infusion",
  "syrup",
  "medication",
  "prescription",
];

const TEXT_KEYS = [
  "text",
  "summary",
  "note",
  "impression",
  "assessment",
  "body",
  "content",
];

export async function assembleBundle({ userId, limit = 600 }: { userId: string; limit?: number }): Promise<PredictionBundle> {
  try {
    const supa = supabaseAdmin();
    const [profileRes, obsRes] = await Promise.all([
      supa
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(),
      supa
        .from("observations")
        .select("*")
        .eq("user_id", userId)
        .order("observed_at", { ascending: false })
        .limit(limit),
    ]);

    const profile = mapProfile(profileRes.data);
    const rows: any[] = Array.isArray(obsRes.data) ? obsRes.data : [];

    const observations: UIObservation[] = [];
    const labs: UILabValue[] = [];
    const medsMap = new Map<string, UIMedication>();
    const chunks: UITextChunk[] = [];

    rows.forEach((row, idx) => {
      const observedAt = pickObserved(row) || undefined;
      const type = pickType(row) || undefined;
      const value = pickValue(row);
      const units = pickUnit(row) || undefined;
      const note = pickNote(row) || undefined;

      observations.push({
        id: row?.id ? String(row.id) : undefined,
        observed_at: observedAt,
        type,
        value: value as any,
        units,
        note,
      });

      if (looksLikeLab(row, type)) {
        labs.push({
          id: row?.id ? String(row.id) : undefined,
          observed_at: observedAt,
          analyte: pickAnalyte(row, type) || undefined,
          value: value as any,
          units,
          ref_low: pickNumber(row, ["ref_low", "refLow", "reference_low", "referenceLow"]),
          ref_high: pickNumber(row, ["ref_high", "refHigh", "reference_high", "referenceHigh"]),
          report_id: pickString(row, ["report_id", "reportId", "source_upload_id", "upload_id"]) || null,
        });
      }

      for (const med of extractMeds(row, observedAt)) {
        if (!med.name) continue;
        const key = [med.name?.toLowerCase() ?? "", med.strength ?? "", med.route ?? "", med.freq ?? ""].join("|");
        if (!medsMap.has(key)) medsMap.set(key, med);
      }

      for (const chunk of extractChunks(row, idx)) {
        if (chunk.text) {
          chunks.push(chunk);
          if (chunks.length >= 600) break;
        }
      }
    });

    if (chunks.length > 600) chunks.length = 600;

    return {
      profile,
      observations,
      labs,
      meds: Array.from(medsMap.values()),
      chunks,
    };
  } catch (error) {
    console.warn("[predict] assemble fallback failed:", error instanceof Error ? error.message : error);
    return { profile: null, observations: [], labs: [], meds: [], chunks: [] };
  }
}

function mapProfile(row: any): UIProfile | null {
  if (!row) return null;

  const heightCm = pickNumber(row, ["height_cm", "height", "height_cm_value"]);
  const heightM = pickNumber(row, ["height_m", "heightMeters"]);
  const resolvedHeight = heightCm ?? (heightM != null ? heightM * 100 : undefined);

  const weightKg = pickNumber(row, ["weight_kg", "weight", "weightKg"]);

  const smoking = normalizeTri(pickString(row, ["smoking", "smoking_status", "smoker", "tobacco_use"]));
  const alcohol = normalizeTri(pickString(row, ["alcohol", "alcohol_use", "drinker", "alcohol_status"]));

  return {
    id: row.id ? String(row.id) : undefined,
    sex: pickString(row, ["sex", "gender"]) || undefined,
    dob: pickString(row, ["dob", "date_of_birth", "birth_date"]) || undefined,
    height_cm: resolvedHeight,
    weight_kg: weightKg,
    bmi: pickNumber(row, ["bmi", "body_mass_index"]),
    smoking: smoking ?? undefined,
    alcohol: alcohol ?? undefined,
    diagnoses: mergeStringArrays([
      row.diagnoses,
      row.conditions,
      row.conditions_predisposition,
      row.chronic_conditions,
    ]),
    allergies: mergeStringArrays([row.allergies, row.allergy_list, row.allergy_history]),
  };
}

function pickObserved(row: any): string {
  const candidates = [
    row?.observed_at,
    row?.observedAt,
    row?.meta?.observed_at,
    row?.meta?.observedAt,
    row?.details?.observed_at,
    row?.details?.observedAt,
    row?.meta?.report_date,
    row?.details?.report_date,
    row?.recorded_at,
    row?.created_at,
  ];
  for (const cand of candidates) {
    const isoValue = toISO(cand);
    if (isoValue) return isoValue;
  }
  return new Date().toISOString();
}

function toISO(value: any): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function pickType(row: any): string | null {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  const candidates = [
    row?.kind,
    row?.type,
    row?.name,
    row?.metric,
    row?.test,
    meta?.analyte,
    meta?.test_name,
    meta?.label,
    meta?.metric,
    details?.label,
    details?.name,
    details?.test,
  ];
  for (const cand of candidates) {
    if (typeof cand === "string" && cand.trim()) return cand.trim();
  }
  return null;
}

function pickValue(row: any): string | number | undefined {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  if (row?.value_num != null && !Number.isNaN(row.value_num)) return row.value_num;
  if (typeof row?.value === "number" && !Number.isNaN(row.value)) return row.value;
  if (typeof meta?.value_num === "number" && !Number.isNaN(meta.value_num)) return meta.value_num;
  if (typeof details?.value_num === "number" && !Number.isNaN(details.value_num)) return details.value_num;

  const strCandidates = [
    row?.value_text,
    row?.value,
    meta?.value_text,
    meta?.value,
    details?.value_text,
    details?.value,
  ];
  for (const cand of strCandidates) {
    if (typeof cand === "string" && cand.trim()) return cand.trim();
  }
  return undefined;
}

function pickUnit(row: any): string | null {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  const candidates = [row?.unit, meta?.unit, details?.unit];
  for (const cand of candidates) {
    if (typeof cand === "string" && cand.trim()) return cand.trim();
  }
  return null;
}

function pickNote(row: any): string | null {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  const candidates = [row?.note, meta?.note, details?.note, meta?.summary, details?.summary, meta?.comment, details?.comment];
  for (const cand of candidates) {
    if (typeof cand === "string" && cand.trim()) return cand.trim();
  }
  for (const key of TEXT_KEYS) {
    const text = meta?.[key] ?? details?.[key];
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return null;
}

function looksLikeLab(row: any, type: string | null): boolean {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  const category = String(meta?.category ?? details?.category ?? row?.category ?? "").toLowerCase();
  if (category === "lab" || category === "labs") return true;
  const analyte = String(meta?.analyte ?? details?.analyte ?? "").toLowerCase();
  const label = String(type ?? "").toLowerCase();
  const joined = `${label} ${analyte}`;
  return LAB_HINTS.some((hint) => joined.includes(hint));
}

function pickAnalyte(row: any, fallback: string | null): string | null {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  const candidates = [meta?.analyte, meta?.label, meta?.name, details?.analyte, details?.label, details?.name, fallback];
  for (const cand of candidates) {
    if (typeof cand === "string" && cand.trim()) return cand.trim();
  }
  return null;
}

function pickNumber(source: any, keys: string[]): number | undefined {
  for (const key of keys) {
    const val = pickRaw(source, key);
    const num = toNumber(val);
    if (num != null) return num;
  }
  return undefined;
}

function pickString(source: any, keys: string[]): string | null {
  for (const key of keys) {
    const val = pickRaw(source, key);
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

function pickRaw(source: any, key: string): any {
  if (!source) return undefined;
  if (key in source) return source[key];
  if (source?.meta && key in source.meta) return source.meta[key];
  if (source?.details && key in source.details) return source.details[key];
  return undefined;
}

function toNumber(val: any): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^0-9.-]+/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeTri(value: string | null): "yes" | "no" | "unknown" | null {
  if (!value) return null;
  const t = value.toLowerCase();
  if (["y", "yes", "true", "current", "active"].includes(t)) return "yes";
  if (["n", "no", "false", "never"].includes(t)) return "no";
  if (["former", "past"].includes(t)) return "unknown";
  return null;
}

function mergeStringArrays(inputs: any[]): string[] | undefined {
  const out: string[] = [];
  for (const input of inputs) {
    const arr = toStringArray(input);
    if (arr.length) out.push(...arr);
  }
  if (!out.length) return undefined;
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const item of out) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(item);
  }
  return dedup;
}

function toStringArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : v != null ? String(v).trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === "string" ? v.trim() : v != null ? String(v).trim() : ""))
          .filter(Boolean);
      }
    } catch {
      // not JSON, fall through to splitting
    }
    return trimmed
      .split(/[;,\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function extractMeds(row: any, observedAt?: string): UIMedication[] {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  const sources = [
    row?.medications,
    row?.meds,
    meta?.medications,
    meta?.meds,
    meta?.medicines,
    meta?.prescriptions,
    meta?.rx,
    details?.medications,
    details?.meds,
  ];
  const out: UIMedication[] = [];
  for (const src of sources) {
    if (!src) continue;
    if (Array.isArray(src)) {
      for (const item of src) {
        const med = normalizeMed(item, row, observedAt);
        if (med) out.push(med);
      }
    } else {
      const med = normalizeMed(src, row, observedAt);
      if (med) out.push(med);
    }
  }

  const type = (pickType(row) || "").toLowerCase();
  if (MED_HINTS.some((hint) => type.includes(hint))) {
    const text = pickValue(row);
    if (typeof text === "string" && text.trim()) {
      out.push({
        id: buildMedId(row, text),
        name: text.trim(),
        strength: undefined,
        route: undefined,
        freq: undefined,
        start_date: undefined,
        stop_date: null,
      });
    }
  }

  return out;
}

function normalizeMed(item: any, row: any, observedAt?: string): UIMedication | null {
  if (!item) return null;
  if (typeof item === "string") {
    const name = item.trim();
    if (!name) return null;
    return {
      id: buildMedId(row, name),
      name,
      strength: undefined,
      route: undefined,
      freq: undefined,
      start_date: observedAt,
      stop_date: null,
    };
  }
  if (typeof item === "object") {
    const name = pickString(item, ["name", "medication", "drug", "label"]);
    const strength = pickString(item, ["strength", "dose", "dosage", "amount"]);
    const route = pickString(item, ["route", "form"]);
    const freq = pickString(item, ["freq", "frequency", "schedule"]);
    const start = pickString(item, ["start_date", "startDate", "started_at", "since"]);
    const stop = pickString(item, ["stop_date", "stopDate", "stopped_at", "ended_at"]);
    if (!name && !strength) return null;
    return {
      id: item?.id ? String(item.id) : buildMedId(row, name || strength || ""),
      name: name || undefined,
      strength: strength || undefined,
      route: route || undefined,
      freq: freq || undefined,
      start_date: start || observedAt,
      stop_date: stop ?? null,
    };
  }
  return null;
}

function buildMedId(row: any, seed: string): string {
  const base = row?.id ? `obs-${row.id}` : "med";
  const norm = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base}-${norm || Math.random().toString(36).slice(2, 8)}`;
}

function extractChunks(row: any, idx: number): UITextChunk[] {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  const candidates = [meta?.chunks, meta?.text_chunks, meta?.textChunks, details?.chunks, details?.text_chunks];
  const out: UITextChunk[] = [];

  let chunkIndex = 0;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      for (const c of candidate) {
        const chunk = normalizeChunk(c, row, idx, chunkIndex++);
        if (chunk) out.push(chunk);
      }
    } else if (typeof candidate === "object") {
      const chunk = normalizeChunk(candidate, row, idx, chunkIndex++);
      if (chunk) out.push(chunk);
    }
  }

  for (const key of TEXT_KEYS) {
    const text = meta?.[key] ?? details?.[key];
    if (typeof text === "string" && text.trim().length > 40) {
      out.push({ ref: buildChunkRef(row, idx, chunkIndex++), text: text.trim() });
      break;
    }
  }

  const type = (pickType(row) || "").toLowerCase();
  if (/report|note|summary|impression/.test(type)) {
    const val = pickValue(row);
    if (typeof val === "string" && val.trim().length > 40) {
      out.push({ ref: buildChunkRef(row, idx, chunkIndex++), text: val.trim() });
    }
  }

  return out;
}

function normalizeChunk(chunk: any, row: any, rowIndex: number, chunkIndex: number): UITextChunk | null {
  if (!chunk) return null;
  if (typeof chunk === "string") {
    const text = chunk.trim();
    if (!text) return null;
    return { ref: buildChunkRef(row, rowIndex, chunkIndex), text };
  }
  if (typeof chunk === "object") {
    const text = pickString(chunk, ["text", "content", "body"]);
    if (!text) return null;
    const ref =
      pickString(chunk, ["ref", "reference"])
        || buildChunkRef(
          row,
          rowIndex,
          pickNumber(chunk, ["chunk_index", "chunkIndex", "index"]) ?? chunkIndex,
          pickNumber(chunk, ["page", "page_number", "pageIndex"]),
          pickString(chunk, ["file_id", "fileId", "upload_id", "source_upload_id"])
        );
    return { ref, text };
  }
  return null;
}

function buildChunkRef(
  row: any,
  rowIndex: number,
  chunkIndex: number,
  page?: number,
  fileId?: string | null
): string {
  const meta = row?.meta ?? {};
  const details = row?.details ?? {};
  const fid = fileId
    || pickString(row, ["file_id", "fileId", "upload_id", "source_upload_id", "report_id"])
    || pickString(meta, ["file_id", "fileId", "upload_id", "source_upload_id", "report_id"])
    || pickString(details, ["file_id", "fileId", "upload_id", "source_upload_id", "report_id"])
    || `obs-${row?.id ?? rowIndex}`;
  const pg = page ?? pickNumber(meta, ["page", "page_number", "pageIndex"]) ?? pickNumber(details, ["page", "page_number", "pageIndex"]) ?? 0;
  const idx = chunkIndex ?? 0;
  return `${fid}:${pg}:${idx}`;
}
