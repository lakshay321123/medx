export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const NO_DATA = "No data available";

type ObservationRow = {
  id?: string | number | null;
  kind?: string | null;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  observed_at?: string | null;
  created_at?: string | null;
  meta?: any;
  details?: any;
  name?: string | null;
};

type PanelDescriptor = {
  id: string;
  label: string;
  synonyms: string[];
  defaultUnit?: string;
};

type PanelSummary = {
  id: string;
  label: string;
  name: string;
  latest?: { value: number; unit: string | null; date?: string | null };
  previous?: { value: number };
};

type SanitizeResult =
  | { ok: true; v: number; unit: string | null }
  | { ok: false };

const LAB_PANELS: PanelDescriptor[] = [
  { id: "hba1c", label: "HbA1c", synonyms: ["hba1c", "hb_a1c", "hb-a1c", "a1c"], defaultUnit: "%" },
  { id: "ldl", label: "LDL", synonyms: ["ldl", "ldl_c", "ldl-c", "ldl_cholesterol"], defaultUnit: "mg/dL" },
  { id: "alt", label: "ALT", synonyms: ["alt", "sgpt"], defaultUnit: "U/L" },
  { id: "egfr", label: "eGFR", synonyms: ["egfr"], defaultUnit: "mL/min/1.73m²" },
  {
    id: "vitamin_d",
    label: "Vitamin D",
    synonyms: ["vitamin_d", "vitamin_d3", "25_oh_vitamin_d", "25-oh-vitamin-d"],
    defaultUnit: "ng/mL",
  },
];

function toTitle(s: string) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function normalize(value: any): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "");
}

function firstDefined<T>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function parseValue(row: ObservationRow): any {
  const meta = row.meta ?? row.details ?? {};
  const candidates = [
    row.value_num,
    row.value_text,
    meta.value_num,
    meta.value,
    meta.result,
    meta.score,
    meta.reading,
  ];
  return firstDefined(...candidates);
}

function resolveUnit(row: ObservationRow): any {
  const meta = row.meta ?? row.details ?? {};
  return firstDefined(row.unit, meta.unit, meta.units, meta.value_unit);
}

function resolveDate(row: ObservationRow): string | undefined {
  const meta = row.meta ?? row.details ?? {};
  return firstDefined(row.observed_at, meta.observed_at, meta.takenAt, meta.taken_at, row.created_at);
}

function isDeleted(row: ObservationRow) {
  const meta = row.meta ?? row.details ?? {};
  if (meta?.deleted || meta?.cleared) return true;
  const unit = typeof row.unit === "string" ? row.unit.trim().toLowerCase() : "";
  return unit === "__deleted__";
}

function sanitize(value: any, unit: any, fallbackUnit?: string): SanitizeResult {
  const numeric =
    typeof value === "string"
      ? Number(value.replace(/[^0-9.+-]+/g, ""))
      : Number(value);
  if (!Number.isFinite(numeric)) {
    return { ok: false };
  }
  const rawUnit = typeof unit === "string" ? unit.trim() : "";
  const lower = rawUnit.toLowerCase();
  let cleanUnit: string | undefined;
  if (lower.includes("mg/dl")) cleanUnit = "mg/dL";
  else if (lower.includes("%")) cleanUnit = "%";
  else if (lower.includes("u/l") || lower.includes("iu/l")) cleanUnit = "U/L";
  else if (lower.includes("ng/ml")) cleanUnit = "ng/mL";
  else if (lower.includes("ml/min")) cleanUnit = "mL/min/1.73m²";
  else if (rawUnit) cleanUnit = rawUnit;
  if (!cleanUnit && fallbackUnit) cleanUnit = fallbackUnit;
  return { ok: true, v: numeric, unit: cleanUnit ?? null };
}

function trend(latest: number, prev?: number) {
  if (prev == null || !Number.isFinite(prev)) return "→";
  if (latest > prev) return "↑";
  if (latest < prev) return "↓";
  return "→";
}

function matchesPanel(row: ObservationRow, panel: PanelDescriptor) {
  if (!row) return false;
  const normalizedKind = normalize(row.kind);
  if (panel.synonyms.includes(normalizedKind)) return true;
  const meta = row.meta ?? row.details ?? {};
  const metaKind = normalize(meta.kind);
  if (metaKind && panel.synonyms.includes(metaKind)) return true;
  const nameCandidates = [
    meta.normalizedName,
    meta.label,
    meta.name,
    meta.metric,
    row.name,
    (row as any).label,
  ];
  for (const candidate of nameCandidates) {
    const norm = normalize(candidate);
    if (norm && panel.synonyms.includes(norm)) return true;
  }
  return false;
}

function computePanels(rows: ObservationRow[]): PanelSummary[] {
  return LAB_PANELS.map(panel => {
    const series = rows
      .filter(row => matchesPanel(row, panel))
      .map(row => ({
        rawValue: parseValue(row),
        rawUnit: resolveUnit(row),
        date: resolveDate(row),
      }))
      .filter(item => item.rawValue != null || item.rawUnit)
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

    const latestEntry = series.find(item => sanitize(item.rawValue, item.rawUnit, panel.defaultUnit).ok);
    if (!latestEntry) {
      return { id: panel.id, label: panel.label, name: panel.label };
    }

    const previousEntry = series.find(item => {
      if (item === latestEntry) return false;
      return sanitize(item.rawValue, item.rawUnit, panel.defaultUnit).ok;
    });

    const latestSan = sanitize(latestEntry.rawValue, latestEntry.rawUnit, panel.defaultUnit) as Extract<
      SanitizeResult,
      { ok: true }
    >;
    const previousSan = previousEntry
      ? (sanitize(previousEntry.rawValue, previousEntry.rawUnit, panel.defaultUnit) as SanitizeResult)
      : { ok: false };

    return {
      id: panel.id,
      label: panel.label,
      name: panel.label,
      latest: {
        value: latestSan.v,
        unit: latestSan.unit ?? panel.defaultUnit ?? null,
        date: latestEntry.date ?? null,
      },
      previous: previousSan.ok ? { value: previousSan.v } : undefined,
    };
  });
}

function formatLabValue(value: number) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatLabDate(iso?: string | null) {
  if (!iso) return "No date recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date recorded";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatUploadsDate(date: Date) {
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function formatListLine(label: string, values: string[]) {
  return `${label}: ${values.length ? values.join(", ") : NO_DATA}`;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ text: "", reasons: "" }, { headers: noStore });
  }

  const db = supabaseAdmin();
  const [pRes, oRes, prRes] = await Promise.all([
    db
      .from("profiles")
      .select("full_name,dob,sex,blood_group,chronic_conditions,conditions_predisposition")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("observations")
      .select("*")
      .eq("user_id", userId)
      .eq("meta->>committed", "true"),
    db
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const asArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const prof: any = pRes.data || {};
  prof.conditions_predisposition = asArray(prof.conditions_predisposition);
  prof.chronic_conditions = asArray(prof.chronic_conditions);

  const rawObs: ObservationRow[] = (oRes.data as ObservationRow[]) || [];
  const obs = rawObs.filter(row => !isDeleted(row));
  const pred = prRes.data?.[0];

  const age = prof.dob
    ? Math.floor((Date.now() - new Date(prof.dob).getTime()) / (365.25 * 864e5))
    : null;

  const patientName = prof.full_name ? toTitle(prof.full_name) : NO_DATA;
  const patientDetails = [prof.sex || null, age ? `${age} y` : null, prof.blood_group || null].filter(Boolean);
  const patientLine =
    patientName === NO_DATA
      ? `Patient: ${patientDetails.length ? patientDetails.join(", ") : NO_DATA}`
      : patientDetails.length
      ? `Patient: ${patientName} (${patientDetails.join(", ")})`
      : `Patient: ${patientName}`;

  const chronicLine = formatListLine("Chronic Conditions", prof.chronic_conditions || []);
  const predisLine = formatListLine("Predispositions", prof.conditions_predisposition || []);

  const committedMeds = obs.filter(row => {
    const kind = normalize(row.kind);
    if (!kind) return false;
    const meta = row.meta ?? row.details ?? {};
    const category = normalize(meta.category);
    const group = normalize(meta.group);
    const committedFlag = meta?.committed;
    const committed =
      committedFlag === true ||
      committedFlag === "true" ||
      committedFlag === undefined;
    if (!committed) return false;
    const isMedKind = kind.startsWith("medication");
    const isMedCategory = category === "medication";
    const isMedGroup = group === "medications";
    return isMedKind || isMedCategory || isMedGroup;
  });

  const medsSet = new Set<string>();
  const activeMeds: string[] = [];
  for (const row of committedMeds) {
    const meta = row.meta ?? row.details ?? {};
    const nameCandidate = [meta.normalizedName, row.value_text, meta.label, row.name]
      .map(value => (typeof value === "string" ? value.trim() : ""))
      .find(Boolean);
    if (!nameCandidate) continue;
    const doseCandidate = [meta.doseLabel, meta.dose, meta.sig]
      .map(value => (typeof value === "string" ? value.trim() : ""))
      .find(Boolean);
    const display = [nameCandidate, doseCandidate].filter(Boolean).join(" ");
    const dedupeKey = `${nameCandidate.toLowerCase()}|${(doseCandidate || "").toLowerCase()}`;
    if (display && !medsSet.has(dedupeKey)) {
      medsSet.add(dedupeKey);
      activeMeds.push(display);
    }
  }
  const medsLine = `Active Meds: ${activeMeds.length ? activeMeds.join(", ") : NO_DATA}`;

  const panels = computePanels(obs);
  const highlights = panels.map(panel => {
    if (!panel.latest) {
      return { label: panel.label, text: NO_DATA };
    }
    const arrow = trend(panel.latest.value, panel.previous?.value);
    const valueText = formatLabValue(panel.latest.value);
    const unitText = panel.latest.unit ? ` ${panel.latest.unit}` : "";
    const dt = formatLabDate(panel.latest.date);
    return { label: panel.label, text: `${panel.name} ${valueText}${unitText} ${arrow} (Last: ${dt})` };
  });

  const labsLines = [
    "Recent Labs:",
    ...highlights.map(item =>
      item.text === NO_DATA ? `- ${item.label}: ${NO_DATA}` : `- ${item.text}`
    ),
  ];

  let predLine = `AI Prediction: ${NO_DATA}`;
  if (pred) {
    const d = pred.details ?? pred.meta ?? {};
    const label = pred.name || d.label || d.name || "Prediction";
    const prob =
      typeof pred.probability === "number"
        ? pred.probability
        : typeof d.probability === "number"
        ? d.probability
        : null;
    const pct = prob != null ? Math.round(prob * 100) : null;
    const bucket = pct == null ? NO_DATA : pct < 20 ? "Low" : pct <= 60 ? "Moderate" : "High";
    const suffix = pct != null ? ` (${pct}%)` : "";
    predLine = `AI Prediction: ${label}: ${bucket}${suffix}`;
  }

  const notes = obs
    .filter(row => /(note|symptom)/i.test(String(row.kind || row.name || "")))
    .sort((a, b) => {
      const da = resolveDate(a);
      const db = resolveDate(b);
      const ta = da ? new Date(da).getTime() : 0;
      const tb = db ? new Date(db).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 2)
    .map(row => {
      const meta = row.meta ?? row.details ?? {};
      const text = firstDefined(row.value_text, meta.summary, meta.text);
      return typeof text === "string" ? text.trim() : "";
    })
    .filter(Boolean);

  const notesLine = `Symptoms/Notes: ${notes.length ? notes.join("; ") : NO_DATA}`;

  const nextStepsArr = (() => {
    const details = pred?.details ?? pred?.meta ?? {};
    const arr = Array.isArray(details.next_steps) ? details.next_steps : [];
    return arr.filter((value: any) => typeof value === "string" && value.trim());
  })();
  const nextStepsValue = nextStepsArr.length ? nextStepsArr.slice(0, 2).join("; ") : NO_DATA;
  const nextStepsLine = `Next Steps: ${nextStepsValue}`;

  const uploadDates = obs
    .map(row => resolveDate(row))
    .map(iso => {
      if (!iso) return null;
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? null : d;
    })
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime());
  const latestUploadDate = uploadDates[0] ?? null;
  const uploadsCount = obs.length;
  const uploadsLine =
    uploadsCount > 0
      ? `Uploads: ${uploadsCount}${latestUploadDate ? ` (Last: ${formatUploadsDate(latestUploadDate)})` : ""}`
      : `Uploads: ${NO_DATA}`;

  const summaryLines = [
    "AI Summary",
    patientLine,
    chronicLine,
    predisLine,
    medsLine,
    ...labsLines,
    predLine,
    notesLine,
    nextStepsLine,
    uploadsLine,
    "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
  ];
  const text = summaryLines.join("\n");

  const reasons: string[] = [];
  highlights
    .filter(item => item.text !== NO_DATA)
    .forEach(item => reasons.push(item.text));
  if (predLine !== `AI Prediction: ${NO_DATA}`) reasons.push(predLine);
  if (activeMeds.length) reasons.push(`Active Meds: ${activeMeds.join(", ")}`);

  return NextResponse.json(
    { text, summary: text, reasons: reasons.join("; ") },
    { headers: noStore }
  );
}
