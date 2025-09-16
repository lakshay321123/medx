import { LabRow, MetricSample, NoteRow, VitalRow } from "./types";

const LIPID_CONV = 38.67; // mmol/L -> mg/dL
const TG_CONV = 88.57; // mmol/L -> mg/dL
const GLUCOSE_CONV = 18; // mmol/L -> mg/dL
const CREAT_CONV = 88.4; // µmol/L -> mg/dL

const PHYSIO: Record<string, { min: number; max: number }> = {
  sbp: { min: 60, max: 260 },
  dbp: { min: 30, max: 150 },
  hr: { min: 30, max: 220 },
  temp_c: { min: 32, max: 43 },
  spo2: { min: 50, max: 100 },
  weight_kg: { min: 25, max: 400 },
  height_cm: { min: 120, max: 230 },
  bmi: { min: 10, max: 80 },
  ldl: { min: 20, max: 400 },
  hdl: { min: 10, max: 150 },
  tg: { min: 30, max: 1000 },
  total_chol: { min: 70, max: 500 },
  hba1c: { min: 3, max: 18 },
  glucose: { min: 40, max: 600 },
  creat: { min: 0.1, max: 20 },
  egfr: { min: 1, max: 150 },
};

function clampPhysio(metric: string, value: number | null | undefined): number | null {
  if (value == null) return null;
  const b = PHYSIO[metric];
  if (!b) return Number.isFinite(value) ? value : null;
  if (!Number.isFinite(value)) return null;
  if (value < b.min || value > b.max) return null;
  return value;
}

function normalizeTemp(value: number | null | undefined, unit?: string | null): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  const u = unit?.toLowerCase();
  if (u?.includes("f")) {
    const c = ((value - 32) * 5) / 9;
    return clampPhysio("temp_c", c);
  }
  if (!u && value > 45) {
    const c = ((value - 32) * 5) / 9;
    return clampPhysio("temp_c", c);
  }
  return clampPhysio("temp_c", value);
}

export function expandVitalSamples(row: VitalRow): Record<string, MetricSample | null> {
  const out: Record<string, MetricSample | null> = {};
  const takenAt = row.taken_at;

  const sbp = clampPhysio("sbp", row.sbp ?? undefined);
  const dbp = clampPhysio("dbp", row.dbp ?? undefined);
  const hr = clampPhysio("hr", row.hr ?? undefined);
  const temp = normalizeTemp(row.temp ?? undefined, row.temp_unit ?? null);
  const spo2 = clampPhysio("spo2", row.spo2 ?? undefined);
  const weight = clampPhysio("weight_kg", row.weight_kg ?? undefined);
  const height = clampPhysio("height_cm", row.height_cm ?? undefined);

  const bmi = clampPhysio(
    "bmi",
    row.bmi != null
      ? row.bmi
      : weight != null && height != null
      ? weight / Math.pow(height / 100, 2)
      : null
  );

  if (sbp != null) out["sbp"] = { value: sbp, takenAt, source: "vital", unit: "mmHg" };
  if (dbp != null) out["dbp"] = { value: dbp, takenAt, source: "vital", unit: "mmHg" };
  if (hr != null) out["hr"] = { value: hr, takenAt, source: "vital", unit: "bpm" };
  if (temp != null) out["temp_c"] = { value: temp, takenAt, source: "vital", unit: "°C" };
  if (spo2 != null) out["spo2"] = { value: spo2, takenAt, source: "vital", unit: "%" };
  if (weight != null) out["weight_kg"] = { value: weight, takenAt, source: "vital", unit: "kg" };
  if (height != null) out["height_cm"] = { value: height, takenAt, source: "vital", unit: "cm" };
  if (bmi != null) out["bmi"] = { value: bmi, takenAt, source: "derived", unit: "kg/m²" };

  return out;
}

function normalizeLabCode(code: string): string {
  return code.trim().toUpperCase();
}

const MMOLL = new Set(["MMOL/L", "MMOL PER L", "MMOL"]);
const UMOLL = new Set(["UMOL/L", "UMOL PER L", "UMOL"]);

export function normalizeLab(row: LabRow): { metric: string; sample: MetricSample } | null {
  if (row.value == null) return null;
  let value = Number(row.value);
  if (!Number.isFinite(value)) return null;

  const code = normalizeLabCode(row.test_code);
  const unit = row.unit ? row.unit.toUpperCase() : null;

  switch (code) {
    case "LDL":
    case "LDL-C":
      if (unit && MMOLL.has(unit)) value = value * LIPID_CONV;
      value = clampPhysio("ldl", value);
      return value == null
        ? null
        : {
            metric: "ldl",
            sample: {
              value,
              takenAt: row.taken_at,
              source: "lab",
              unit: "mg/dL",
              refLow: row.ref_low,
              refHigh: row.ref_high,
            },
          };
    case "HDL":
      if (unit && MMOLL.has(unit)) value = value * LIPID_CONV;
      value = clampPhysio("hdl", value);
      return value == null
        ? null
        : {
            metric: "hdl",
            sample: {
              value,
              takenAt: row.taken_at,
              source: "lab",
              unit: "mg/dL",
              refLow: row.ref_low,
              refHigh: row.ref_high,
            },
          };
    case "TRIG":
    case "TG":
    case "TRIGLYCERIDES":
      if (unit && MMOLL.has(unit)) value = value * TG_CONV;
      value = clampPhysio("tg", value);
      return value == null
        ? null
        : {
            metric: "tg",
            sample: {
              value,
              takenAt: row.taken_at,
              source: "lab",
              unit: "mg/dL",
              refLow: row.ref_low,
              refHigh: row.ref_high,
            },
          };
    case "TOTAL_CHOL":
    case "TC":
    case "CHOL":
    case "CHOLESTEROL":
      if (unit && MMOLL.has(unit)) value = value * LIPID_CONV;
      value = clampPhysio("total_chol", value);
      return value == null
        ? null
        : {
            metric: "total_chol",
            sample: {
              value,
              takenAt: row.taken_at,
              source: "lab",
              unit: "mg/dL",
              refLow: row.ref_low,
              refHigh: row.ref_high,
            },
          };
    case "HBA1C":
    case "A1C":
      value = clampPhysio("hba1c", value);
      return value == null
        ? null
        : {
            metric: "hba1c",
            sample: {
              value,
              takenAt: row.taken_at,
              source: "lab",
              unit: "%",
              refLow: row.ref_low,
              refHigh: row.ref_high,
            },
          };
    case "GLUCOSE":
    case "FASTING_GLUC":
    case "FASTING_GLUCOSE":
    case "GLU":
      if (unit && MMOLL.has(unit)) value = value * GLUCOSE_CONV;
      value = clampPhysio("glucose", value);
      return value == null
        ? null
        : {
            metric: "glucose",
            sample: {
              value,
              takenAt: row.taken_at,
              source: "lab",
              unit: "mg/dL",
              refLow: row.ref_low,
              refHigh: row.ref_high,
            },
          };
    case "CREAT":
    case "CREATININE":
      if (unit && UMOLL.has(unit)) value = value / CREAT_CONV;
      value = clampPhysio("creat", value);
      return value == null
        ? null
        : {
            metric: "creat",
            sample: {
              value,
              takenAt: row.taken_at,
              source: "lab",
              unit: "mg/dL",
              refLow: row.ref_low,
              refHigh: row.ref_high,
            },
          };
    case "EGFR":
      value = clampPhysio("egfr", value);
      return value == null
        ? null
        : {
            metric: "egfr",
            sample: {
              value,
              takenAt: row.taken_at,
              source: "lab",
              unit: "mL/min/1.73m²",
              refLow: row.ref_low,
              refHigh: row.ref_high,
            },
          };
    default:
      return null;
  }
}

export function extractNoteFlags(notes: NoteRow[]): { tags: string[]; lastNoteAt?: string } {
  const tagSet = new Set<string>();
  let last: string | undefined;
  for (const note of notes) {
    if (Array.isArray(note.tags)) {
      for (const t of note.tags) {
        if (t) tagSet.add(String(t).toLowerCase());
      }
    }
    if (!last || new Date(note.created_at) > new Date(last)) last = note.created_at;
  }
  return { tags: [...tagSet].sort(), lastNoteAt: last };
}
