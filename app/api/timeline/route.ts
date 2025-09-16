export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActivePatientId } from "@/lib/server/patientContext";
import { buildShortSummaryFromText } from "@/lib/shortSummary";

const noStore = { "Cache-Control": "no-store, max-age=0" };

const iso = (ts: any) => {
  const d = new Date(ts || Date.now());
  return Number.isNaN(+d) ? new Date().toISOString() : d.toISOString();
};

const pickObserved = (row: any) =>
  iso(
    row.observed_at ??
      row.generated_at ??
      row.meta?.report_date ??
      row.details?.report_date ??
      row.meta?.observed_at ??
      row.details?.observed_at ??
      row.created_at ??
      row.createdAt ??
      row.timestamp
  );

function normalizeFactors(value: any): Array<{ name: string; detail: string }> {
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === "object" && item && typeof item.name === "string") {
          return {
            name: item.name,
            detail: typeof item.detail === "string" ? item.detail : "",
          };
        }
        if (Array.isArray(item) && item.length >= 2) {
          return { name: String(item[0]), detail: String(item[1] ?? "") };
        }
        return null;
      })
      .filter((item): item is { name: string; detail: string } => !!item);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeFactors(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

function toRiskScore(value: any) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value > 1 && value <= 100) return Math.round((value / 100) * 1000) / 1000;
  return Math.round(value * 1000) / 1000;
}

export async function GET() {
  try {
    const patientId = await getActivePatientId();
    if (!patientId) return NextResponse.json({ items: [] }, { headers: noStore });

    const supa = supabaseAdmin();
    const [predRes, obsRes] = await Promise.all([
      supa
        .from("predictions")
        .select("id, condition, risk_score, risk_label, generated_at, created_at, top_factors, features, model")
        .eq("patient_id", patientId)
        .order("generated_at", { ascending: false })
        .limit(60),
      supa
        .from("observations")
        .select("*")
        .eq("patient_id", patientId)
        .eq('meta->>committed', 'true')
        .order("observed_at", { ascending: false })
        .limit(200),
    ]);

    if (predRes.error)
      return NextResponse.json({ error: predRes.error.message }, { status: 500, headers: noStore });
    if (obsRes.error)
      return NextResponse.json({ error: obsRes.error.message }, { status: 500, headers: noStore });

    const preds = (predRes.data ?? []).map(row => {
      const probability = toRiskScore(row.risk_score);
      return {
        id: String(row.id),
        kind: "prediction",
        name: row.condition ?? "Prediction",
        probability,
        observed_at: pickObserved(row),
        uploaded_at: iso(row.generated_at ?? row.created_at),
        meta: {
          riskLabel: row.risk_label ?? "Unknown",
          topFactors: normalizeFactors(row.top_factors),
          model: row.model ?? null,
        },
        file: null,
      };
    });

    const obs = (obsRes.data ?? []).map(row => {
      const meta = row.meta ?? row.details ?? {};
      if (!meta.summary) {
        meta.summary = buildShortSummaryFromText(meta.text, meta.summary_long);
      }
      const name =
        row.name ??
        row.metric ??
        row.test ??
        meta?.analyte ??
        meta?.test_name ??
        meta?.label ??
        "Observation";
      const value = row.value ?? row.value_num ?? meta?.value ?? meta?.value_num ?? row.value_text ?? null;
      const unit = row.unit ?? meta?.unit ?? null;
      const file = {
        upload_id: row.source_upload_id ?? row.upload_id ?? meta?.upload_id ?? null,
        bucket: meta?.bucket ?? null,
        path: meta?.storage_path ?? meta?.path ?? null,
        name: meta?.file_name ?? meta?.name ?? null,
        mime: meta?.mime ?? null,
      };
      return {
        id: String(row.id),
        kind: "observation",
        name,
        value,
        unit,
        flags: Array.isArray(row.flags) ? row.flags : Array.isArray(meta?.flags) ? meta.flags : null,
        observed_at: pickObserved(row),
        uploaded_at: iso(row.created_at ?? row.createdAt),
        meta,
        file,
      };
    });

    const items = [...preds, ...obs].sort(
      (a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
    );

    return NextResponse.json({ items }, { headers: noStore });
  } catch (err: any) {
    console.error("/api/timeline failed", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500, headers: noStore });
  }
}
