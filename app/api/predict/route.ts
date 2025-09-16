export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildPatientPacket } from "@/lib/aidoc/patient-packet";
import { callOpenAIJson } from "@/lib/aidoc/vendor";

export async function POST(req: Request) {
  try {
    const supa = supabaseAdmin();
    const userId = await getUserId();
    const { patientId, source = "recompute" } = await req.json();

    if (!userId || !patientId) {
      return NextResponse.json({ error: "missing userId or patientId" }, { status: 400 });
    }

    const packet = await buildPatientPacket({ patientId, userId });

    const ai = await callOpenAIJson({
      op: "predict",
      patientPacket: packet,
      source,
      schema: "AiPredictionsV1",
    });

    const now = new Date().toISOString();
    const rows = (ai?.predictions ?? []).map((p: any) => ({
      patient_id: patientId,
      user_id: userId,
      domain: p.domain,
      label: p.label,
      type: "risk",
      probability: typeof p.score === "number" ? p.score : null,
      meta: {
        top_factors: p.top_factors ?? [],
        rationale: p.rationale ?? "",
        confidence: p.confidence ?? null,
        inputs_hash: ai?.inputs_hash ?? null,
        model: ai?.model ?? "gpt-5",
        version: ai?.version ?? "v1",
        source,
      },
      created_at: now,
    }));

    if (rows.length) {
      const { error } = await supa.from("predictions").insert(rows);
      if (error) {
        console.warn("[/api/predict] insert error:", error.message);
      }
    }

    return NextResponse.json({ status: "ok", saved: rows.length }, { status: 202 });
  } catch (e: any) {
    console.error("[/api/predict] fatal:", e?.message || e);
    return NextResponse.json({ status: "error" }, { status: 202 });
  }
}

