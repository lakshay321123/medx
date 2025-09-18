import { canonicalizeInputs } from "@/lib/medical/engine/extract";
import {
  inferCategory,
  labelFor,
  type PatientProfile,
  type PatientSnapshot,
  type RawObservation,
  valueFor,
} from "@/lib/patient/snapshot";

const MAX_CONTEXT_ROWS = 60;
const MAX_TEXT_LENGTH = 600;

export type ClinicalInputs = Record<string, number>;

const SUPERSUB_MAP: Record<string, string> = {
  "⁰": "0",
  "ⁱ": "i",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
};

function normalizeForMatch(raw: string): string {
  if (!raw) return "";
  const decomposed = raw.normalize("NFKD");
  const stripped = decomposed.replace(/[\u0300-\u036f]/g, "");
  const mapped = Array.from(stripped)
    .map((ch) => SUPERSUB_MAP[ch] ?? ch)
    .join("");
  return mapped
    .replace(/[\u202f\u00a0\u2007\u2060]/g, " ")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[∕⁄]/g, "/")
    .toLowerCase();
}

function sanitizeNumeric(raw: string): number | null {
  if (!raw) return null;
  let cleaned = raw
    .replace(/[\u202f\u00a0\s]/g, "")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[⁺₊]/g, "+")
    .replace(/[⁻₋]/g, "-");

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (hasComma) {
    const parts = cleaned.split(",");
    const last = parts[parts.length - 1] || "";
    if (last.length > 0 && last.length <= 2) {
      cleaned = parts.slice(0, -1).join("") + "." + last;
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function formatPatientContext({
  snapshot,
  rawObservations,
}: {
  snapshot: PatientSnapshot;
  rawObservations: RawObservation[];
}): string {
  const lines: string[] = [];
  const profile = snapshot.profile;

  lines.push(buildDemographicsLine(profile));
  lines.push(
    profile.chronic_conditions.length
      ? `Chronic conditions: ${profile.chronic_conditions.join(", ")}`
      : "Chronic conditions: none recorded"
  );
  lines.push(
    profile.conditions_predisposition.length
      ? `Family history / predisposition: ${profile.conditions_predisposition.join(", ")}`
      : "Family history / predisposition: none recorded"
  );

  if (snapshot.highlights.length) {
    lines.push("Key recent labs:");
    for (const hl of snapshot.highlights) lines.push(`- ${hl}`);
  }

  const observationLines = buildObservationContextLines(rawObservations);
  if (observationLines.length) {
    lines.push("Observations (latest first):");
    lines.push(...observationLines);
  } else {
    lines.push("Observations: none captured.");
  }

  return lines.join("\n");
}

function buildDemographicsLine(profile: PatientProfile): string {
  const parts: string[] = [];
  if (profile.name) parts.push(`Name: ${profile.name}`);
  if (profile.age != null) parts.push(`Age: ${profile.age}`);
  if (profile.sex) parts.push(`Sex: ${profile.sex}`);
  if (profile.blood_group) parts.push(`Blood group: ${profile.blood_group}`);
  return parts.length ? `Demographics: ${parts.join(", ")}` : "Demographics: not recorded";
}

function buildObservationContextLines(rows: RawObservation[]): string[] {
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(b?.observed_at || b?.created_at || 0).getTime() -
      new Date(a?.observed_at || a?.created_at || 0).getTime()
  );
  const lines: string[] = [];
  for (const row of sorted) {
    if (lines.length >= MAX_CONTEXT_ROWS) break;
    const label = labelFor(row) || row?.kind || "Observation";
    const when = row?.observed_at || row?.created_at || "";
    const date = when ? new Date(when).toISOString().slice(0, 16).replace("T", " ") : "";
    const category = inferCategory(row);
    const value = valueFor(row);
    const narrative = pickNarrative(row);
    const source = pickSource(row);
    const parts = [`- ${date || ""} | ${category}`.trim()];
    parts.push(`${label}${value ? `: ${cleanWhitespace(String(value))}` : ""}`.trim());
    if (source) parts.push(`Source: ${source}`);
    if (narrative) parts.push(`Text: ${narrative}`);
    lines.push(parts.join(" — "));
  }
  return lines;
}

function pickSource(row: RawObservation): string | null {
  const meta = row?.meta || row?.details || {};
  const src =
    meta?.source_type ||
    meta?.source ||
    meta?.modality ||
    meta?.category ||
    meta?.origin ||
    null;
  return typeof src === "string" && src.trim() ? cleanWhitespace(src) : null;
}

function pickNarrative(row: RawObservation): string | null {
  const meta = row?.meta || row?.details || {};
  const candidates = [
    row?.value_text,
    meta?.summary,
    meta?.text,
    meta?.report,
    meta?.content,
    Array.isArray(meta?.sections)
      ? (meta.sections as unknown[])
          .map((s) => (typeof s === "string" ? s : typeof s === "object" && s && "text" in s ? (s as any).text : ""))
          .join("\n")
      : null,
  ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);

  if (!candidates.length) return null;
  const merged = cleanWhitespace(candidates.join(" \n "));
  if (!merged) return null;
  return truncate(merged, MAX_TEXT_LENGTH);
}

function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export function extractObservationInputs(rows: RawObservation[]): ClinicalInputs {
  const out: ClinicalInputs = {};
  const seenAt: Record<string, number> = {};
  for (const row of rows) {
    const key = detectCanonicalKey(row);
    if (!key) continue;
    const numeric = extractNumericValue(row);
    if (numeric == null) continue;
    const unit = (row?.unit || row?.meta?.unit || "").toLowerCase();
    const converted = convertToCanonical(key, numeric, unit);
    if (converted == null || Number.isNaN(converted)) continue;
    const at = new Date(row?.observed_at || row?.created_at || 0).getTime();
    if (!Number.isFinite(at)) continue;
    if (seenAt[key] == null || at > seenAt[key]) {
      out[key] = Number(converted.toFixed(4));
      seenAt[key] = at;
    }
  }
  return out;
}

function detectCanonicalKey(row: RawObservation): string | null {
  const meta = row?.meta || row?.details || {};
  const haystack = normalizeForMatch(
    [
      row?.kind,
      row?.name,
      meta?.label,
      meta?.name,
      meta?.analyte,
      meta?.test_name,
      meta?.title,
      meta?.canonical_key,
      meta?.short_name,
    ]
      .map((s) => (typeof s === "string" ? s : ""))
      .filter(Boolean)
      .join(" ")
  );

  if (!haystack) return null;

  const unit = normalizeForMatch(row?.unit || meta?.unit || "");

  if (/\b(sodium|na\+?)\b/.test(haystack)) return "Na";
  if (/\b(potassium|k\+?)\b/.test(haystack)) return "K";
  if (/\b(chloride|cl\-?)\b/.test(haystack)) return "Cl";
  if (/\b(bicarb|hco3|tco2|co2 total|total co2)\b/.test(haystack)) {
    if (/mmhg|kpa/.test(unit)) return "pCO2";
    return "HCO3";
  }
  if (/\balbumin\b/.test(haystack)) return "albumin";
  if (/\b(glucose|fpg|fasting_glucose|blood sugar)\b/.test(haystack)) return "glucose_mgdl";
  if (/\b(bun|urea nitrogen|urea)\b/.test(haystack)) return "BUN";
  if (/\bcreatinine\b/.test(haystack)) return "creatinine";
  if (/\b(osm(olality)?|osmo)\b/.test(haystack)) return "measured_osm";
  if (/\blactate\b/.test(haystack)) return "lactate";
  if (/\bpao2\b/.test(haystack)) return "PaO2";
  if (/\bpaco2|pco2\b/.test(haystack)) return "pCO2";
  if (/\bph\b/.test(haystack)) return "pH";
  if (/\bbeta[-\s]?hydroxybutyrate|b[-\s]?ohb\b/.test(haystack)) return "beta_hydroxybutyrate";
  if (/\bketone\b/.test(haystack)) return "serum_ketones";
  if (/\banion\s*gap\b/.test(haystack)) return "anion_gap_reported";
  if (/\bmagnesium|mg\b/.test(haystack)) return "Mg";
  if (/\bcalcium|ca\b/.test(haystack)) return "Ca";
  if (/\bphosphate|po4\b/.test(haystack)) return "phosphate";
  if (/\bhemoglobin|hb\b/.test(haystack)) return "Hb";
  if (/\bwbc|white blood cell\b/.test(haystack)) return "WBC";
  if (/\bplatelet\b/.test(haystack)) return "platelets";
  if (/\btemperature|temp\b/.test(haystack)) return /f/.test(unit) ? "temp_f" : "temp_c";
  if (/\bheart rate|hr\b/.test(haystack)) return "HR";
  if (/\brespiratory rate|rr\b/.test(haystack)) return "RR";
  if (/\bsbp|systolic\b/.test(haystack)) return "SBP";
  if (/\bdbp|diastolic\b/.test(haystack)) return "DBP";

  return null;
}

function extractNumericValue(row: RawObservation): number | null {
  const meta = row?.meta || row?.details || {};
  const candidates: Array<number | string | null | undefined> = [
    row?.value_num,
    meta?.value_num,
    row?.value_text,
    meta?.value,
    meta?.summary,
    meta?.text,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string") {
      const match = normalizeForMatch(c).match(/[-+]?\d+(?:[.,]\d+)?/);
      if (match) {
        const num = sanitizeNumeric(match[0]);
        if (num != null) return num;
      }
    }
  }
  return null;
}

function convertToCanonical(key: string, value: number, unit: string): number | null {
  switch (key) {
    case "glucose_mgdl":
      if (/mmol/.test(unit)) return value * 18;
      return value;
    case "BUN":
      if (/mmol/.test(unit)) return value * 2.801;
      return value;
    case "creatinine":
      if (/µ?mol/.test(unit)) return value / 88.4;
      return value;
    case "albumin":
      if (/g\/?l/.test(unit)) return value / 10;
      return value;
    case "lactate":
      if (/mg\/?dl/.test(unit)) return value / 9;
      return value;
    case "pCO2":
      if (/kpa/.test(unit)) return value * 7.50062;
      return value;
    case "temp_c":
      if (/f/.test(unit)) return (value - 32) * (5 / 9);
      return value;
    case "temp_f":
      if (!/f/.test(unit) && /c/.test(unit)) return value * (9 / 5) + 32;
      return value;
    default:
      return value;
  }
}

export function labsFromObservations(rows: RawObservation[]): Array<{
  name: string;
  value: number | string | null;
  unit: string | null;
  takenAt: string;
}> {
  const labs: Array<{ name: string; value: number | string | null; unit: string | null; takenAt: string }> = [];
  const seen = new Set<string>();
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(b?.observed_at || b?.created_at || 0).getTime() -
      new Date(a?.observed_at || a?.created_at || 0).getTime()
  );
  for (const row of sorted) {
    if (labs.length >= 40) break;
    const category = inferCategory(row);
    if (category !== "lab") continue;
    const name = labelFor(row);
    if (!name) continue;
    const key = `${name}|${row?.observed_at || row?.created_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = row?.meta || row?.details || {};
    const takenAt = row?.observed_at || row?.created_at || new Date().toISOString();
    const num = extractNumericValue(row);
    const unit = row?.unit || meta?.unit || null;
    const value = num ?? row?.value_text ?? meta?.value ?? meta?.summary ?? null;
    labs.push({ name, value, unit, takenAt });
  }
  return labs;
}

export function mergeClinicalInputs(
  observationInputs: ClinicalInputs,
  messageInputs: Record<string, any>
): Record<string, any> {
  const raw = { ...observationInputs, ...messageInputs };
  return canonicalizeInputs(raw);
}

export type DoctorPatientSummary = {
  name?: string | null;
  age?: number | string | null;
  sex?: string | null;
  encounterDate?: string | null;
  diagnoses?: string[];
  comorbidities?: string[];
  meds?: string[];
  labs?: Array<{ name: string; value: string | number; unit?: string | null }>;
  allergies?: string[];
};

export function doctorPatientFromSnapshot(
  snapshot: PatientSnapshot | null | undefined,
): DoctorPatientSummary {
  if (!snapshot) {
    return {
      name: null,
      age: null,
      sex: null,
      encounterDate: null,
      diagnoses: [],
      comorbidities: [],
      meds: [],
      labs: [],
      allergies: [],
    };
  }

  const labs = labsFromObservations(snapshot.rawObservations)
    .map((lab) => {
      if (!lab.name) return null;
      if (typeof lab.value === "number") {
        return { name: lab.name, value: lab.value, unit: lab.unit ?? null };
      }
      const text = lab.value == null ? "" : cleanWhitespace(String(lab.value));
      if (!text) return null;
      return { name: lab.name, value: text, unit: lab.unit ?? null };
    })
    .filter((row): row is { name: string; value: string | number; unit: string | null } => !!row)
    .slice(0, 20);

  const diagnoses = collectStringsByCategory(snapshot.rawObservations, "diagnosis");
  const meds = collectStringsByCategory(snapshot.rawObservations, "medication");
  const allergies = collectStringsByCategory(snapshot.rawObservations, "allergy");

  const chronic = dedupeStrings(snapshot.profile.chronic_conditions || []);
  const familyHistory = dedupeStrings(snapshot.profile.conditions_predisposition || []).map(
    (item) => `Family history: ${item}`,
  );
  const comorbidities = dedupeStrings([...chronic, ...familyHistory]);

  const encounterDate = latestEncounterDate(snapshot.rawObservations);

  const fallbacks = dedupeStrings([...diagnoses, ...chronic]);

  return {
    name: snapshot.profile.name ?? null,
    age: snapshot.profile.age ?? null,
    sex: snapshot.profile.sex ?? null,
    encounterDate,
    diagnoses: fallbacks.length ? fallbacks : undefined,
    comorbidities: comorbidities.length ? comorbidities : undefined,
    meds: meds.length ? meds : undefined,
    labs: labs.length ? labs : undefined,
    allergies: allergies.length ? allergies : undefined,
  };
}

function latestEncounterDate(rows: RawObservation[]): string | null {
  let latest = -Infinity;
  for (const row of rows) {
    const ts = new Date(row?.observed_at || row?.created_at || 0).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts > latest) latest = ts;
  }
  if (!Number.isFinite(latest) || latest <= 0) return null;
  return new Date(latest).toISOString().slice(0, 10);
}

function collectStringsByCategory(
  rows: RawObservation[],
  category: string,
  limit = 12,
): string[] {
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(b?.observed_at || b?.created_at || 0).getTime() -
      new Date(a?.observed_at || a?.created_at || 0).getTime(),
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of sorted) {
    if (inferCategory(row) !== category) continue;
    const text = describeObservation(row);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function describeObservation(row: RawObservation): string | null {
  const label = labelFor(row);
  const value = valueFor(row);
  const cleanLabel = label ? cleanWhitespace(label) : "";
  const cleanValue = value ? cleanWhitespace(value) : "";
  if (cleanLabel && cleanValue) {
    const vLower = cleanValue.toLowerCase();
    const lLower = cleanLabel.toLowerCase();
    if (vLower.startsWith(lLower)) return cleanValue;
    return `${cleanLabel} — ${cleanValue}`;
  }
  return cleanValue || cleanLabel || null;
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    if (raw == null) continue;
    const text = cleanWhitespace(String(raw));
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

