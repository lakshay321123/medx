// app/api/timeline/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActivePatientId } from "@/lib/server/patientContext";

type ObservationRow = {
  id: string;
  kind: string | null;
  value_num?: number | null;
  value_text?: string | null;
  units?: string | null;
  thread_id?: string | null;
  observed_at?: string | null;
  created_at?: string | null;
  meta?: Record<string, any> | null;
};

type PredictionRow = {
  id?: string | null;
  condition?: string | null;
  risk_score?: number | string | null;
  risk_label?: string | null;
  generated_at?: string | null;
  created_at?: string | null;
  model?: string | null;
};

type TimelineEvent = {
  id: string;
  type: "prediction" | "observation";
  label: string;
  timestamp: string;
  value?: string | number | null;
  unit?: string | null;
  detail?: string | null;
  source?: string | null;
};

const KIND_LABELS: Record<string, string> = {
  hba1c: "HbA1c",
  tsh: "TSH",
  fsh: "FSH",
  uibc: "UIBC",
  ldl_cholesterol: "LDL-C",
  urine_physical_quantity: "Urine (physical)",
  conjugated_bilirubin: "Conjugated Bilirubin",
  egfr: "eGFR",
  bmi: "BMI",
  hr: "Heart rate",
  bp: "Blood pressure",
};

function canonicalLabel(kind?: string | null) {
  if (!kind) return "Observation";
  const key = kind.toLowerCase().replace(/\s+/g, "_");
  return KIND_LABELS[key] || kind;
}

function normalizeValue(value: number | string | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) % 1 === 0) return value;
    return Number(value.toFixed(2));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

function coalesceTimestamp(row: { observed_at?: string | null; created_at?: string | null }) {
  return row.observed_at || row.created_at || new Date().toISOString();
}

function riskScoreToPercent(score: number | string | null | undefined) {
  if (score == null) return null;
  let parsed: number | null = null;
  if (typeof score === "number" && Number.isFinite(score)) parsed = score;
  if (typeof score === "string") {
    const val = Number.parseFloat(score);
    if (Number.isFinite(val)) parsed = val;
  }
  if (parsed == null) return null;
  if (parsed > 1 && parsed <= 100) parsed = parsed / 100;
  if (parsed < 0) parsed = 0;
  if (parsed > 1) parsed = 1;
  return Math.round(parsed * 100);
}

function mapObservation(row: ObservationRow): TimelineEvent {
  const timestamp = coalesceTimestamp(row);
  const value = normalizeValue(row.value_num ?? row.value_text ?? null);
  const metaSource = typeof row.meta?.source === "string" ? row.meta?.source : null;
  const note = typeof row.meta?.note === "string" ? row.meta.note : null;
  return {
    id: `obs:${row.id}`,
    type: "observation",
    label: canonicalLabel(row.kind),
    timestamp,
    value,
    unit: row.units ?? null,
    detail: note,
    source: row.thread_id ?? metaSource ?? null,
  };
}

function mapPrediction(row: PredictionRow): TimelineEvent {
  const timestamp = row.generated_at || row.created_at || new Date().toISOString();
  const pct = riskScoreToPercent(row.risk_score);
  const label = row.condition ? `${row.condition} prediction` : "Prediction";
  return {
    id: row.id ? `pred:${row.id}` : `pred:${timestamp}`,
    type: "prediction",
    label,
    timestamp,
    value: pct != null ? pct : null,
    unit: pct != null ? "%" : null,
    detail: row.risk_label ? `Risk: ${row.risk_label}` : null,
    source: row.model ?? null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const patientId = await getActivePatientId(req);
    const supabase = supabaseAdmin();

    const [obsRes, predRes] = await Promise.all([
      supabase
        .from("observations")
        .select("id, kind, value_num, value_text, units, thread_id, observed_at, created_at, meta")
        .eq("patient_id", patientId)
        .filter("meta->>committed", "eq", "true")
        .order("observed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(200),
      supabase
        .from("predictions")
        .select("id, condition, risk_score, risk_label, generated_at, created_at, model")
        .eq("patient_id", patientId)
        .order("generated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(60),
    ]);

    if (obsRes.error) {
      throw new Error(obsRes.error.message);
    }
    if (predRes.error) {
      throw new Error(predRes.error.message);
    }

    const observationEvents = (obsRes.data ?? []).map(mapObservation);
    const predictionEvents = (predRes.data ?? []).map(mapPrediction);

    const events = [...observationEvents, ...predictionEvents].sort((a, b) => {
      const aTs = new Date(a.timestamp).getTime();
      const bTs = new Date(b.timestamp).getTime();
      const safeA = Number.isFinite(aTs) ? aTs : 0;
      const safeB = Number.isFinite(bTs) ? bTs : 0;
      return safeB - safeA;
    });

    return NextResponse.json({ events });
  } catch (err: any) {
    console.error("/api/timeline failed", err);
    return NextResponse.json({ error: err?.message || "Failed to load timeline" }, { status: 500 });
  }
}
