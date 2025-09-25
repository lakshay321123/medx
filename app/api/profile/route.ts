export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

function noStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0" };
}

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
  id?: string | null;
  key: string; // observation kind (e.g., "alt", "mri_report")
  label: string; // human-friendly label
  value: string | number | null;
  unit: string | null;
  observedAt: string;
  source?: string | null; // modality/source (e.g., "MRI", "PDF", "Rx")
  name?: string | null;
  meta?: any;
};

type Groups = Record<GroupKey, Item[]>;

// --- labels (extendable) ---
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
  total_bilirubin: "Bilirubin Total",
  direct_bilirubin: "Bilirubin Direct",
  indirect_bilirubin: "Bilirubin Indirect",
  hemoglobin: "Hemoglobin",
  wbc: "WBC",
  platelets: "Platelets",
  esr: "ESR",
  uibc: "UIBC",
  tibc: "TIBC",
  transferrin_saturation: "Transferrin Saturation",
  total_cholesterol: "Total Cholesterol",
  triglycerides: "Triglycerides",
  ldl: "LDL",
  hdl: "HDL",
  vitamin_d: "Vitamin D",
  vitamin_b12: "Vitamin B12",
  creatinine: "Serum Creatinine",
  lipase: "Serum Lipase",
  amylase: "Serum Amylase",
  fsh: "FSH",
  lh: "LH",
  rheumatoid_factor: "Rheumatoid Factor",
  rbc_count: "Erythrocyte Count",
};

// --- normalization for common synonyms/kinds ---
function normalizeKind(raw: string) {
  const k = String(raw || "").trim().toLowerCase().replace(/\s+/g, "_");
  // exact matches or common synonyms
  if (["erythrocyte_count", "rbc", "rbc_count"].includes(k)) return "rbc_count";
  if (["total_chol", "cholesterol", "cholesterol_total"].includes(k)) return "total_cholesterol";
  if (["bilirubin", "tbil", "tbil_total"].includes(k)) return "total_bilirubin";
  if (["vit_b12", "b12"].includes(k)) return "vitamin_b12";
  if (["vitamin_d3", "25_oh_vitamin_d", "25-oh-vitamin-d"].includes(k)) return "vitamin_d";
  if (["serum_creatinine"].includes(k)) return "creatinine";
  if (["rf", "ra_factor"].includes(k)) return "rheumatoid_factor";
  return k;
}

// --- deterministic overrides (canonical kind -> group) ---
const KIND_CATEGORY_OVERRIDES: Record<string, GroupKey> = {
  // always labs:
  rbc_count: "labs",
  hemoglobin: "labs",
  wbc: "labs",
  platelets: "labs",
  esr: "labs",
  uibc: "labs",
  tibc: "labs",
  transferrin_saturation: "labs",
  egfr: "labs",
  creatinine: "labs",
  fasting_glucose: "labs",
  hba1c: "labs",
  total_cholesterol: "labs",
  triglycerides: "labs",
  ldl: "labs",
  hdl: "labs",
  total_bilirubin: "labs",
  direct_bilirubin: "labs",
  indirect_bilirubin: "labs",
  alt: "labs",
  ast: "labs",
  alp: "labs",
  ggt: "labs",
  vitamin_d: "labs",
  vitamin_b12: "labs",
  lipase: "labs",
  amylase: "labs",
  fsh: "labs",
  lh: "labs",
  rheumatoid_factor: "labs",

  // real vitals:
  bp: "vitals",
  hr: "vitals",
  bmi: "vitals",
  height: "vitals",
  weight: "vitals",
  spo2: "vitals",
  pulse: "vitals",
};

// imaging trigger words, but require 'report' or meta.imaging to avoid false positives
const IMG_WORDS = ["xray", "xr", "cxr", "ct", "mri", "usg", "ultrasound", "echo"];
const RX_WORDS  = ["med", "rx", "drug", "dose", "tablet", "capsule", "syrup"];

// broader lab hints
const LAB_HINT = [
  "glucose","cholesterol","triglycer","hba1c","egfr","creatinine","bun",
  "bilirubin","ast","alt","alp","ggt","hb","hemoglobin","wbc","platelet","esr",
  "ferritin","tibc","uibc","transferrin","sodium","potassium","ldl","hdl",
  "vitamin","lipase","amylase","fsh","lh","rheumatoid"
];

function startCase(s: string) {
  return s.replaceAll("_", " ").replace(/(^|\s)\S/g, c => c.toUpperCase());
}

function classify(kindRaw: string, meta: any): GroupKey {
  const kind = normalizeKind(kindRaw);
  // 1) explicit override
  if (KIND_CATEGORY_OVERRIDES[kind]) return KIND_CATEGORY_OVERRIDES[kind];

  const k = kind;
  const cat = (meta?.category as string | undefined)?.toLowerCase();
  const modality = (meta?.modality as string | undefined)?.toLowerCase();
  const src = (meta?.source_type as string | undefined)?.toLowerCase();
  const textHas = (arr: string[]) => arr.some(w => k.includes(w));

  // 2) explicit meta from parser
  if (cat === "vital") return "vitals";
  if (cat === "lab") return "labs";
  if (cat === "imaging") return "imaging";
  if (cat === "medication" || cat === "prescription") return "medications";
  if (cat === "diagnosis" || cat === "problem") return "diagnoses";
  if (cat === "procedure") return "procedures";
  if (cat === "immunization" || cat === "vaccine") return "immunizations";
  if (cat === "note" || cat === "symptom") return "notes";

  // 3) heuristics (tightened)
  const looksImaging = textHas(IMG_WORDS) || (modality && IMG_WORDS.some(w => modality.includes(w)));
  if (looksImaging && (k.includes("report") || cat === "imaging")) return "imaging";

  if (textHas(RX_WORDS)) return "medications";
  if (textHas(["bp","hr","pulse","temp","spo2","bmi","height","weight"])) return "vitals";
  if (textHas(LAB_HINT)) return "labs";
  if (src === "note" || src === "text" || k.includes("note") || k.includes("symptom")) return "notes";

  return "other";
}

export async function GET(_req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { profile: null },
      { status: 200, headers: noStoreHeaders() }
    );
  }

  const sb = supabaseAdmin();

  const [profileRes, observationsRes, predictionRes] = await Promise.all([
    sb
      .from("profiles")
      .select(
        "id, full_name, dob, sex, blood_group, conditions_predisposition, chronic_conditions"
      )
      .eq("id", userId)
      .maybeSingle(),
    sb
      .from("observations")
      .select(
        "id, kind, name, value_num, value_text, unit, observed_at, meta, details, thread_id"
      )
      .eq("user_id", userId)
      .order("observed_at", { ascending: false })
      .limit(600),
    sb
      .from("predictions")
      .select("id, created_at, name, summary, details, risk_score, probability, band")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (profileRes.error) {
    return NextResponse.json(
      { error: profileRes.error.message },
      { status: 500, headers: noStoreHeaders() }
    );
  }
  if (observationsRes.error) {
    return NextResponse.json(
      { error: observationsRes.error.message },
      { status: 500, headers: noStoreHeaders() }
    );
  }
  if (predictionRes.error) {
    return NextResponse.json(
      { error: predictionRes.error.message },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const profile = profileRes.data;
  const rows = observationsRes.data;
  const predictionRow = predictionRes.data?.[0] ?? null;

  // --- normalize arrays: accept text[] or JSON-stringified arrays ---
  const asArray = (x: any) => {
    if (Array.isArray(x)) return x;
    if (typeof x === "string") {
      try {
        const p = JSON.parse(x);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  if (profile) {
    (profile as any).conditions_predisposition = asArray((profile as any).conditions_predisposition);
    (profile as any).chronic_conditions = asArray((profile as any).chronic_conditions);
  }

  // Keep only latest per kind
  const latestByKind = new Map<
    string,
    {
      id: string | null;
      value: string | number | null;
      unit: string | null;
      observedAt: string;
      meta: any;
      name: string | null;
      raw: any;
    }
  >();
  for (const r of rows ?? []) {
    if (latestByKind.has(r.kind)) continue; // first seen = latest
    latestByKind.set(r.kind, {
      id: r.id ?? null,
      value: r.value_num ?? r.value_text ?? null,
      unit: r.unit ?? null,
      observedAt: r.observed_at,
      meta: r.meta ?? r.details ?? null,
      name: r.name ?? null,
      raw: r,
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

  for (const [rawKind, info] of latestByKind.entries()) {
    const kind = normalizeKind(rawKind);
    const group = classify(kind, info.meta);

    const preferredLabel =
      info.meta?.label ||
      info.meta?.name ||
      info.meta?.medication ||
      info.meta?.title ||
      info.name ||
      LABELS[kind] ||
      startCase(kind);

    let val: string | number | null = info.value;
    if (val && typeof val === "object") {
      try {
        val = JSON.stringify(val);
      } catch {
        val = String(val);
      }
    }
    if (typeof val === "string" && val.length > 160) {
      val = val.slice(0, 155).trimEnd() + "…";
    }

    groups[group].push({
      id: info.id,
      key: kind,
      label: preferredLabel,
      value: val,
      unit: info.unit,
      observedAt: info.observedAt,
      source: info.meta?.modality || info.meta?.source_type || info.meta?.source || null,
      name: info.name,
      meta: info.meta,
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

  const predictionDetails = (() => {
    if (!predictionRow) return null;
    const raw = (predictionRow as any).details ?? null;
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return parsed ?? null;
      } catch {
        return null;
      }
    }
    return null;
  })();

  const prediction = predictionRow
    ? {
        id: predictionRow.id,
        createdAt: predictionRow.created_at,
        name: predictionRow.name || predictionDetails?.label || null,
        summary:
          predictionRow.summary ||
          predictionDetails?.summary ||
          predictionDetails?.structured?.summary ||
          null,
        band:
          predictionRow.band ||
          predictionDetails?.band ||
          predictionDetails?.structured?.band ||
          predictionDetails?.structured?.risk?.band ||
          null,
        riskScore:
          predictionRow.risk_score ??
          predictionDetails?.risk_score ??
          predictionDetails?.structured?.risk_score ??
          predictionDetails?.structured?.risk?.score ??
          null,
        probability:
          predictionRow.probability ??
          predictionDetails?.probability ??
          predictionDetails?.structured?.probability ??
          predictionDetails?.structured?.risk?.probability ??
          null,
        structured: predictionDetails?.structured ?? null,
      }
    : null;

  return NextResponse.json(
    { profile: profile ?? null, groups, latest, prediction },
    { headers: noStoreHeaders() }
  );
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();                  // must be a UUID (see Option B if testing)
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const allowed = [
    "full_name",
    "dob",
    "sex",
    "blood_group",
    "conditions_predisposition",
    "chronic_conditions",
  ] as const;

  const patch: Record<string, any> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];

  // Create-or-update by primary key id
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}

