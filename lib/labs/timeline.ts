// lib/labs/timeline.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type ObRow = {
  observed_at: string | null;
  kind: string;            // e.g. 'alt', 'ldl', 'blood_sugar_fasting'
  value_num: number | null;
  unit: string | null;     // e.g. 'mg/dl', 'u/l', '%'
};

// Canonical labels by "kind" (aligns with lib/labs/summary.ts TEST_DEFINITIONS)
const KIND_TO_NAME: Record<string, string> = {
  ldl: "LDL Cholesterol",
  ldl_cholesterol: "LDL Cholesterol",
  hdl: "HDL Cholesterol",
  hdl_cholesterol: "HDL Cholesterol",
  triglycerides: "Triglycerides",
  tg: "Triglycerides",
  total_cholesterol: "Total Cholesterol",
  cholesterol: "Total Cholesterol",
  cholesterol_total: "Total Cholesterol",
  hba1c: "HbA1c",
  blood_sugar_fasting: "Fasting Glucose",
  fbg: "Fasting Glucose",
  alt: "ALT (SGPT)",
  sgpt: "ALT (SGPT)",
  ast: "AST (SGOT)",
  sgot: "AST (SGOT)",
  ggt: "GGT",
  alp: "ALP",
  egfr: "EGFR",
  creatinine: "Creatinine",
  urea: "Urea",
  vitd: "Vitamin D (25-OH)",
  vitamin_d: "Vitamin D (25-OH)",
  vitamin_d_25_oh: "Vitamin D (25-OH)",
  "25_oh_vitamin_d": "Vitamin D (25-OH)",
  esr: "ESR",
  uibc: "UIBC",
  unsaturated_iron_binding_capacity: "UIBC",
  tibc: "TIBC",
  ferritin: "Ferritin",
};

function canonicalName(kind: string, fallback?: string) {
  return KIND_TO_NAME[kind] || fallback || kind;
}

function canonicalUnit(u: string | null): string {
  if (!u) return "";
  return u
    .trim()
    .replace(/u\/l/i, "U/L")
    .replace(/mg\/dl/i, "mg/dL")
    .replace(/ng\/ml/i, "ng/mL")
    .replace(/mm\/ist\s*hr/i, "mm/1st hr")
    .replace(/\s+/g, " ");
}

function dateKey(iso: string | null): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

type Marker = null | { tag: "H" | "L"; label: "High" | "Low" };

// Conservative adult reference windows (display only; adjust later if you wire lab-specific ranges)
function markerFor(name: string, value: number, unit: string): Marker {
  const n = name;
  if (!Number.isFinite(value)) return null;

  // Lipids
  if (n === "Total Cholesterol" && unit === "mg/dL") return value >= 200 ? { tag: "H", label: "High" } : null;
  if (n === "LDL Cholesterol" && unit === "mg/dL")   return value >= 130 ? { tag: "H", label: "High" } : null;
  if (n === "HDL Cholesterol" && unit === "mg/dL")   return value < 40 ? { tag: "L", label: "Low" } : null;
  if (n === "Triglycerides" && unit === "mg/dL")     return value >= 150 ? { tag: "H", label: "High" } : null;

  // Glycemic
  if (n === "Fasting Glucose" && unit === "mg/dL")   return value < 70 ? { tag: "L", label: "Low" } : (value >= 100 ? { tag: "H", label: "High" } : null);
  if (n === "HbA1c" && unit === "%")                 return value >= 5.7 ? { tag: "H", label: "High" } : null;

  // Liver
  if (n === "ALT (SGPT)" && unit === "U/L")          return value > 45 ? { tag: "H", label: "High" } : null;
  if (n === "AST (SGOT)" && unit === "U/L")          return value > 40 ? { tag: "H", label: "High" } : null;
  if (n === "ALP" && unit === "U/L")                 return (value < 45 || value > 115) ? { tag: value>115 ? "H":"L", label: value>115 ? "High":"Low" } : null;

  // Inflammation
  if (n === "ESR")                                   return null; // lab/age/sex-specific; skip generic flag

  // Renal / Iron / Vitamins (display without marker by default)
  if (["EGFR","Creatinine","Urea","UIBC","TIBC","Ferritin","Vitamin D (25-OH)"].includes(n)) return null;

  return null;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return d.toLocaleDateString(undefined, opts);
}

export function buildReportTimeline(rows: ObRow[]) {
  // → Normalize, group, de-dup
  const byDate = new Map<string, { name: string; value: number; unit: string; marker: Marker }[]>();

  for (const r of rows) {
    if (r.value_num === null || r.value_num === undefined) continue;
    const d = dateKey(r.observed_at);
    if (!d) continue;
    const name = canonicalName(r.kind);
    const unit = canonicalUnit(r.unit);
    if (!name || !unit) continue;

    const marker = markerFor(name, r.value_num, unit);
    const arr = byDate.get(d) ?? [];
    // de-dup within date
    const k = `${name}|${r.value_num}|${unit}`;
    if (!arr.some(x => `${x.name}|${x.value}|${x.unit}` === k)) {
      arr.push({ name, value: r.value_num!, unit, marker });
      byDate.set(d, arr);
    }
  }

  // Sort dates desc
  const dates = Array.from(byDate.keys()).sort((a,b) => (a < b ? 1 : -1));

  let out = `# Report Timeline (newest first)\n\n`;
  for (const d of dates) {
    const items = byDate.get(d)!;

    // Highlights: collect abnormal tags
    const abnormal = items.filter(i => i.marker).map(i => `${i.name} (${i.marker!.tag})`);
    out += `## ${shortDate(d)}\n`;
    if (abnormal.length) {
      out += `**Highlights:** ${abnormal.join(", ")}\n\n`;
    }

    // Panel buckets (only render if present)
    const panel = {
      Liver: items.filter(i => ["ALT (SGPT)","AST (SGOT)","ALP","GGT"].includes(i.name)),
      Glucose: items.filter(i => ["Fasting Glucose","HbA1c"].includes(i.name)),
      Lipids: items.filter(i => ["Total Cholesterol","LDL Cholesterol","HDL Cholesterol","Triglycerides"].includes(i.name)),
      "Renal/Iron": items.filter(i => ["EGFR","Creatinine","Urea","TIBC","UIBC","Ferritin"].includes(i.name)),
      Inflammation: items.filter(i => ["ESR"].includes(i.name)),
      Other: items.filter(i =>
        !["ALT (SGPT)","AST (SGOT)","ALP","GGT","Fasting Glucose","HbA1c",
          "Total Cholesterol","LDL Cholesterol","HDL Cholesterol","Triglycerides",
          "EGFR","Creatinine","Urea","TIBC","UIBC","Ferritin","ESR"
        ].includes(i.name)
      ),
    };

    const renderLine = (title: string, list: typeof items) => {
      if (!list.length) return "";
      const parts = list
        .sort((a,b) => a.name.localeCompare(b.name))
        .map(i => `${i.name} ${i.value} ${i.unit}${i.marker ? ` (${i.marker.tag}) – ${i.marker.label}` : ""}`);
      return `**${title}:** ${parts.join(" · ")}\n`;
    };

    out +=
      renderLine("Liver", panel.Liver) +
      renderLine("Glucose", panel.Glucose) +
      renderLine("Lipids", panel.Lipids) +
      renderLine("Renal/Iron", panel["Renal/Iron"]) +
      renderLine("Inflammation", panel.Inflammation) +
      renderLine("Other", panel.Other);

    out += `\n`;
  }

  if (dates.length === 0) {
    out += "_No reports found. Upload a lab PDF or photo to get started._\n";
  }
  return out.trim();
}

// Convenience: load rows for the current user (limit can be tuned)
export async function fetchObservationRows(sb: SupabaseClient, userId: string, limit = 1000): Promise<ObRow[]> {
  const { data, error } = await sb
    .from("observations")
    .select("observed_at, kind, value_num, unit")
    .eq("user_id", userId)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ObRow[];
}

// Simple intent detection for AI Doc
export function isPullReportsIntent(t: string): boolean {
  const k = (t || "").toLowerCase();
  return [
    "pull my reports",
    "report timeline",
    "show my report timeline",
    "pull all my reports",
    "show reports",
    "fetch my reports",
  ].some(p => k.includes(p));
}
