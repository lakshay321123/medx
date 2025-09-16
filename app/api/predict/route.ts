export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActivePatientId } from "@/lib/server/patientContext";
import { runPredictionEngine } from "@/lib/server/predictionEngine";

function isTrue(value: string | undefined | null) {
  return String(value ?? "").toLowerCase() === "true";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const source = typeof body?.source === "string" ? body.source : null;
    if (isTrue(process.env.FEATURE_AIDOC_ONLY) && source !== "ai-doc") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patientId = await getActivePatientId(req);

    const { predictions, stale } = await runPredictionEngine(patientId);

    if (predictions.length > 0) {
      const supa = supabaseAdmin();
      const insertRows = predictions.map(pred => ({
        patient_id: patientId,
        generated_at: pred.generatedAt,
        condition: pred.condition,
        risk_score: pred.riskScore,
        risk_label: pred.riskLabel,
        top_factors: pred.topFactors,
        features: pred.features,
        model: pred.model,
      }));
      const { error } = await supa.from("predictions").insert(insertRows);
      if (error) {
        throw new Error(error.message);
      }
    }

    const status = stale ? 422 : 200;
    return NextResponse.json({ results: predictions, stale }, { status });
  } catch (err: any) {
    console.error("/api/predict failed", err);
    return NextResponse.json(
      { error: err?.message || "Prediction failed" },
      { status: 500 }
    );
  }
}
