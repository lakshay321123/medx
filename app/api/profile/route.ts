export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

// Group types for the UI
type GroupKey =
  | "vitals"
  | "labs"
  | "imaging"
  | "medications"
  | "diagnoses"
  | "procedures"
  | "immunizations"
  | "notes"
  | "other";

type Item = {
  key: string;                 // observation kind (e.g., "alt", "mri_report")
  label: string;               // human-friendly label
  value: string | number | null;
  unit: string | null;
  observedAt: string;
  source?: string | null;      // modality/source (e.g., "MRI", "PDF", "Rx")
};

type Groups = Record<GroupKey, Item[]>;

// Optional friendly labels (fallback: startCase(kind))
const LABELS: Record<string, string> = {
  bp: "BP",
  hr: "HR",
  bmi: "BMI",
  hba1c: "HbA1c",
  fasting_glucose: "Fasting Glucose",
  egfr: "eGFR",
  alt: "ALT",
  ast: "AST",
  alp: "ALP",
  ggt: "GGT",
  total_bilirubin: "Total Bilirubin",
  hemoglobin: "Hemoglobin",
  wbc: "WBC",
  platelets: "Platelets",
  esr: "ESR",
};

const RX_WORDS = ["med", "rx", "drug", "dose", "tablet", "capsule", "syrup"];
const IMG_WORDS = ["xray", "xr", "cxr", "ct", "mri", "usg", "ultrasound", "echo"];
const VITAL_WORDS = ["bp", "hr", "pulse", "temp", "spo2", "bmi", "height", "weight"];
const LAB_HINT = [
  "glucose","cholesterol","triglycer","hba1c","egfr","creatinine","bun",
  "bilirubin","ast","alt","alp","ggt","hb","hemoglobin","wbc","platelet","esr",
  "ferritin","tibc","uibc","transferrin","sodium","potassium","ldl","hdl"
];

function startCase(s: string) {
  return s.replaceAll("_", " ").replace(/(^|\s)\S/g, c => c.toUpperCase());
}

function classify(kind: string, meta: any): GroupKey {
  const k = kind.toLowerCase();
  const cat = (meta?.category as string | undefined)?.toLowerCase();
  const modality = (meta?.modality as string | undefined)?.toLowerCase();
  const src = (meta?.source_type as string | undefined)?.toLowerCase();

  // Prefer explicit metadata from the parser
  if (cat === "vital") return "vitals";
  if (cat === "lab") return "labs";
  if (cat === "imaging") return "imaging";
  if (cat === "medication" || cat === "prescription") return "medications";
  if (cat === "diagnosis" || cat === "problem") return "diagnoses";
  if (cat === "procedure") return "procedures";
  if (cat === "immunization" || cat === "vaccine") return "immunizations";
  if (cat === "note" || cat === "symptom") return "notes";

  // Heuristics
  if (IMG_WORDS.some(w => k.includes(w)) || (modality && IMG_WORDS.some(w => modality.includes(w)))) return "imaging";
  if (RX_WORDS.some(w => k.includes(w))) return "medications";
  if (VITAL_WORDS.some(w => k.includes(w))) return "vitals";
  if (LAB_HINT.some(w => k.includes(w))) return "labs";
  if (src === "note" || src === "text" || k.includes("note") || k.includes("symptom")) return "notes";

  return "other";
}

export async function GET(_req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const sb = supabaseAdmin();

  // Profile row (unchanged)
  const { data: profile, error: perr } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });

  // Pull a window of observations; newest first
  const { data: rows, error: oerr } = await sb
    .from("observations")
    .select("kind, value_num, value_text, unit, observed_at, meta")
    .eq("user_id", userId)
    .order("observed_at", { ascending: false })
    .limit(600);
  if (oerr) return NextResponse.json({ error: oerr.message }, { status: 500 });

  // Keep only latest per kind
  const latestByKind = new Map<
    string,
    { value: string | number | null; unit: string | null; observedAt: string; meta: any }
  >();
  for (const r of rows ?? []) {
    if (latestByKind.has(r.kind)) continue; // first seen = latest
    latestByKind.set(r.kind, {
      value: r.value_num ?? r.value_text ?? null,
      unit: r.unit ?? null,
      observedAt: r.observed_at,
      meta: r.meta ?? null,
    });
  }

  // Build groups
  const groups: Groups = {
    vitals: [],
    labs: [],
    imaging: [],
    medications: [],
    diagnoses: [],
    procedures: [],
    immunizations: [],
    notes: [],
    other: [],
  };

  for (const [kind, info] of latestByKind.entries()) {
    const group = classify(kind, info.meta);
    const label = LABELS[kind] ?? startCase(kind);

    let val: string | number | null = info.value;
    if (typeof val === "string" && val.length > 160) {
      val = val.slice(0, 155).trimEnd() + "…";
    }

    groups[group].push({
      key: kind,
      label,
      value: val,
      unit: info.unit,
      observedAt: info.observedAt,
      source: info.meta?.modality || info.meta?.source_type || null,
    });
  }

  // Sort each group by date (desc)
  (Object.keys(groups) as GroupKey[]).forEach(g =>
    groups[g].sort((a, b) => (a.observedAt > b.observedAt ? -1 : 1))
  );

  // Optional backward-compat: simple latest map (in case anything still expects it)
  const latest: Record<string, { value: string | number | null; unit: string | null; observedAt: string } | null> = {};
  for (const [k, v] of latestByKind) {
    latest[k] = { value: v.value, unit: v.unit, observedAt: v.observedAt };
  }

  return NextResponse.json({ profile, groups, latest });
}

