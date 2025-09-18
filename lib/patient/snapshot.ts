import { supabaseAdmin } from "@/lib/supabase/admin";

export type PatientProfile = {
  name: string | null;
  dob: string | null;
  age: number | null;
  sex: string | null;
  blood_group: string | null;
  chronic_conditions: string[];
  conditions_predisposition: string[];
};

export type RawObservation = {
  kind?: string | null;
  name?: string | null;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  meta?: any;
  details?: any;
  observed_at?: string | null;
  created_at?: string | null;
};

export type ObservationLine = {
  label: string;
  value: string;
  observedAt: string;
  category: string;
  kind: string | null;
  unit: string | null;
  meta: any;
};

export type PatientSnapshot = {
  profile: PatientProfile;
  observations: ObservationLine[];
  highlights: string[];
  rawObservations: RawObservation[];
};

export async function loadPatientSnapshot(
  userId: string,
  opts: { limit?: number } = {}
): Promise<PatientSnapshot | null> {
  const { limit = 120 } = opts;
  const supa = supabaseAdmin();
  const [{ data: profileRow, error: profileErr }, { data: obsRows, error: obsErr }] = await Promise.all([
    supa
      .from("profiles")
      .select(
        "full_name,dob,sex,blood_group,conditions_predisposition,chronic_conditions"
      )
      .eq("id", userId)
      .maybeSingle(),
    supa
      .from("observations")
      .select(
        "kind,name,value_num,value_text,unit,meta,details,observed_at,created_at"
      )
      .eq("user_id", userId)
      .order("observed_at", { ascending: false })
      .limit(limit),
  ]);

  if (profileErr) throw new Error(profileErr.message);
  if (obsErr) throw new Error(obsErr.message);

  const rawObservations = obsRows || [];
  if (!profileRow && rawObservations.length === 0) return null;

  const profile = normalizeProfile(profileRow || {});
  const observations = buildObservationLines(rawObservations);
  const highlights = buildHighlights(rawObservations);

  return { profile, observations, highlights, rawObservations };
}

function normalizeProfile(row: any): PatientProfile {
  const chronic = toArray(row?.chronic_conditions);
  const predis = toArray(row?.conditions_predisposition);
  const dob = typeof row?.dob === "string" ? row.dob : null;
  const age = dob ? calcAge(dob) : null;
  return {
    name: typeof row?.full_name === "string" ? row.full_name : null,
    dob,
    age,
    sex: typeof row?.sex === "string" ? row.sex : null,
    blood_group: typeof row?.blood_group === "string" ? row.blood_group : null,
    chronic_conditions: chronic,
    conditions_predisposition: predis,
  };
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function calcAge(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

export function buildObservationLines(rows: RawObservation[]): ObservationLine[] {
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(b?.observed_at || b?.created_at || 0).getTime() -
      new Date(a?.observed_at || a?.created_at || 0).getTime()
  );

  const MAX = 60;
  const lines: ObservationLine[] = [];
  for (const row of sorted) {
    if (lines.length >= MAX) break;
    const label = labelFor(row);
    const value = valueFor(row);
    const observedAt = row?.observed_at || row?.created_at || new Date().toISOString();
    const category = inferCategory(row);
    if (!label || !value) continue;
    lines.push({
      label,
      value,
      observedAt,
      category,
      kind: row?.kind ?? null,
      unit: row?.unit ?? row?.meta?.unit ?? null,
      meta: row?.meta ?? row?.details ?? null,
    });
  }
  return lines;
}

export function labelFor(row: RawObservation): string | null {
  const meta = row?.meta || row?.details || {};
  return (
    row?.name ||
    row?.kind ||
    meta?.label ||
    meta?.name ||
    meta?.analyte ||
    meta?.test_name ||
    meta?.title ||
    null
  );
}

export function valueFor(row: RawObservation): string | null {
  const meta = row?.meta || row?.details || {};
  const raw =
    row?.value_num ??
    row?.value_text ??
    meta?.value_num ??
    meta?.value ??
    meta?.summary ??
    meta?.text ??
    null;
  const unit = row?.unit || meta?.unit || "";
  if (raw == null) return null;
  if (typeof raw === "number") return `${raw}${unit ? ` ${unit}` : ""}`;
  const txt = String(raw).trim();
  return txt ? `${txt}${unit ? ` ${unit}` : ""}` : null;
}

export function inferCategory(row: RawObservation): string {
  const meta = row?.meta || row?.details || {};
  const cat = typeof meta?.category === "string" ? meta.category.toLowerCase() : "";
  if (cat) return cat;
  const kind = `${row?.kind || ""}`.toLowerCase();
  if (/(lab|glucose|chol|hba1c|egfr|bilirubin|ldl|hdl|vitamin)/.test(kind)) return "lab";
  if (/(note|symptom|complaint)/.test(kind)) return "note";
  if (/(diagnosis|dx|problem|assessment)/.test(kind)) return "diagnosis";
  if (/(allergy|intolerance)/.test(kind)) return "allergy";
  if (/(med|rx|drug|tablet|capsule)/.test(kind)) return "medication";
  if (/(imaging|ct|mri|xray|ultrasound|echo)/.test(kind)) return "imaging";
  return cat || "observation";
}

export function buildHighlights(rows: RawObservation[]): string[] {
  const pick = (rx: RegExp) =>
    [...rows]
      .filter((r) => {
        const text = `${r?.kind || ""} ${r?.name || ""} ${JSON.stringify(r?.meta || {})}`.toLowerCase();
        return rx.test(text);
      })
      .sort(
        (a, b) =>
          new Date(b?.observed_at || b?.created_at || 0).getTime() -
          new Date(a?.observed_at || a?.created_at || 0).getTime()
      )[0];

  const line = (label: string, row: RawObservation | undefined) => {
    if (!row) return null;
    const val = valueFor(row);
    if (!val) return null;
    const when = row?.observed_at || row?.created_at || "";
    const date = when ? new Date(when).toISOString().slice(0, 10) : "";
    return `${label}: ${val}${date ? ` (${date})` : ""}`;
  };

  const highlights = [
    line("HbA1c", pick(/\bhba1c\b/)),
    line("Fasting glucose", pick(/fasting|fpg|fbs|glucose/)),
    line("LDL", pick(/\bldl\b/)),
    line("eGFR", pick(/\begfr\b/)),
    line("Vitamin D", pick(/vitamin\s*d/)),
  ].filter(Boolean) as string[];

  return highlights.slice(0, 5);
}
