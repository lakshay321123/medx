export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const iso = (ts: any) => {
  const d = new Date(ts || Date.now());
  return isNaN(+d) ? new Date().toISOString() : d.toISOString();
};

const pickObserved = (r: any) =>
  iso(
    r.report_date ??
      r.meta?.report_date ??
      r.details?.report_date ??
      r.observed_at ??
      r.observedAt ??
      r.recorded_at ??
      r.measured_at ??
      r.taken_at ??
      r.sampled_at ??
      r.timestamp ??
      r.created_at ??
      r.createdAt ??
      r.meta?.observed_at ??
      r.details?.observed_at
  );

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ items: [] }, { headers: noStore });
  const supa = supabaseAdmin();

  const { data: patientRows, error: patientErr } = await supa
    .from("patients")
    .select("id")
    .eq("user_id", userId);
  if (patientErr)
    return NextResponse.json({ error: patientErr.message }, { status: 500, headers: noStore });

  const patientIds = (patientRows ?? []).map(r => r.id);

  let predictionRows: any[] = [];
  if (patientIds.length) {
    const predRes = await supa
      .from("predictions")
      .select("id, patient_id, generated_at, condition, risk_score, risk_label, features, top_factors, model, patient_summary_md, clinician_summary_md, summarizer_model, summarizer_error")
      .in("patient_id", patientIds);
    if (predRes.error)
      return NextResponse.json(
        { error: predRes.error.message },
        { status: 500, headers: noStore }
      );
    predictionRows = predRes.data ?? [];
  }

  const obsRes = await supa
    .from("observations")
    .select("*")
    .eq("user_id", userId)
    .eq('meta->>committed','true');
  if (obsRes.error)
    return NextResponse.json(
      { error: obsRes.error.message },
      { status: 500, headers: noStore }
    );

  const preds = predictionRows.map((r: any) => {
    const meta = {
      risk_label: r.risk_label,
      features: r.features,
      top_factors: r.top_factors,
      model: r.model,
      patient_summary_md: r.patient_summary_md,
      clinician_summary_md: r.clinician_summary_md,
      summarizer_model: r.summarizer_model,
      summarizer_error: r.summarizer_error,
      patient_id: r.patient_id,
    };
    const prob = typeof r.risk_score === "number" ? r.risk_score : null;
    return {
      id: String(r.id),
      kind: "prediction",
      name: r.condition || "Prediction",
      probability: prob,
      observed_at: iso(r.generated_at ?? Date.now()),
      uploaded_at: iso(r.generated_at ?? Date.now()),
      meta,
      file: null,
    };
  });

  const obs = (obsRes.data || []).map((r: any) => {
    const m = r.meta ?? r.details ?? {};
    if (!m.summary) {
      m.summary = buildShortSummaryFromText(m.text, m.summary_long);
    }
    const name =
      r.name ??
      r.metric ??
      r.test ??
      m?.analyte ??
      m?.test_name ??
      m?.label ??
      "Observation";
    const value = r.value ?? m?.value ?? null;
    const unit = r.unit ?? m?.unit ?? null;
    const flags = Array.isArray(r.flags)
      ? r.flags
      : Array.isArray(m?.flags)
      ? m.flags
      : null;
    const file = {
      upload_id: r.source_upload_id ?? r.upload_id ?? m?.upload_id ?? null,
      bucket: m?.bucket ?? null,
      path: m?.storage_path ?? m?.path ?? null,
      name: m?.file_name ?? m?.name ?? null,
      mime: m?.mime ?? null,
    };
    return {
      id: String(r.id),
      kind: "observation",
      name,
      value,
      unit,
      flags,
      observed_at: pickObserved(r),
      uploaded_at: iso(r.created_at ?? r.createdAt),
      meta: m || {},
      file,
    };
  });

  const dedup = new Map<string, any>();
  for (const it of [...preds, ...obs]) {
    const key =
      it.file?.upload_id ||
      it.meta?.source_hash ||
      `${it.name}|${it.observed_at}|${"value" in it ? it.value ?? "" : ""}`;
    if (!dedup.has(key)) dedup.set(key, it);
  }
  const items = Array.from(dedup.values()).sort(
    (a, b) =>
      new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );
  return NextResponse.json({ items }, { headers: noStore });
}
