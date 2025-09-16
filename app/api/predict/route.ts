export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recomputeRisk, generateSummaries } from "@/lib/aidoc/risk";
import type { SummaryBundle } from "@/lib/aidoc/risk/types";

function noStore() {
  return { "Cache-Control": "no-store, max-age=0" };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore() });

    const body = await req.json().catch(() => ({} as any));
    const patientId = body?.patientId ? String(body.patientId) : null;
    const source = body?.source ? String(body.source) : null;

    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400, headers: noStore() });
    if (source !== "ai-doc") return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore() });

    const supa = supabaseAdmin();
    const { data: patientRow, error: patientError } = await supa
      .from("patients")
      .select("id,user_id,dob,sex,name")
      .eq("id", patientId)
      .maybeSingle();
    if (patientError) throw new Error(patientError.message);
    if (!patientRow) return NextResponse.json({ error: "patient_not_found" }, { status: 404, headers: noStore() });
    if (patientRow.user_id && patientRow.user_id !== userId)
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore() });

    const { dataset, features, domains, model } = await recomputeRisk(patientId);

    const anySignals = domains.some(domain => domain.topFactors.some(f => f.name !== "Data stale/insufficient"));
    if (!anySignals) {
      return NextResponse.json(
        { error: "data_insufficient", results: domains },
        { status: 422, headers: noStore() }
      );
    }

    let summary: SummaryBundle | null = null;
    let summaryError: string | null = null;
    try {
      const res = await generateSummaries({ patient: dataset.patient, features, domains });
      if (res.bundle) summary = res.bundle;
      else summaryError = res.error ?? "summary_failed";
    } catch (err: any) {
      summaryError = err?.message || "summary_failed";
    }

    const rows = domains.map(domain => ({
      patient_id: patientId,
      generated_at: domain.generatedAt,
      condition: domain.condition,
      risk_score: domain.riskScore,
      risk_label: domain.riskLabel,
      features: domain.features,
      top_factors: domain.topFactors,
      model: model,
      patient_summary_md: summary?.patient_summary_md ?? null,
      clinician_summary_md: summary?.clinician_summary_md ?? null,
      summarizer_model: summary?.summarizer_model ?? null,
      summarizer_error: summaryError,
    }));

    const { data: inserted, error: insertError } = await supa
      .from("predictions")
      .insert(rows)
      .select(
        "id, generated_at, condition, risk_score, risk_label, features, top_factors, model, patient_summary_md, clinician_summary_md, summarizer_model, summarizer_error"
      );
    if (insertError) throw new Error(insertError.message);

    if (inserted && inserted.length) {
      await supa.from("timeline_events").insert({
        patient_id: patientId,
        type: "prediction",
        occurred_at: new Date().toISOString(),
        meta: {
          prediction_ids: inserted.map(r => r.id),
          conditions: inserted.map(r => r.condition),
          model,
        },
      });
    }

    const results = (inserted || []).map(row => ({
      condition: row.condition,
      group: "Cardio-Metabolic" as const,
      riskScore: row.risk_score,
      riskLabel: row.risk_label,
      topFactors: row.top_factors,
      features: row.features,
      generatedAt: row.generated_at,
      model: row.model,
      summaries: summary
        ? {
            patient_summary_md: summary.patient_summary_md,
            clinician_summary_md: summary.clinician_summary_md,
            summarizer_model: summary.summarizer_model,
          }
        : null,
      summarizerError: summary ? null : summaryError,
    }));

    return NextResponse.json({ results }, { headers: noStore() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "predict_failed" }, { status: 500, headers: noStore() });
  }
}
