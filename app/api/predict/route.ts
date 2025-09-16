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

    if (!userId) {
      return NextResponse.json({ error: "missing userId" }, { status: 401 });
    }

    if (!patientId) {
      return NextResponse.json({ status: "skipped" }, { status: 202 });
    }

    const packet = await buildPatientPacket({ patientId, userId });

    const ai = process.env.AIDOC_SYNC_PREDICT === "1" ? await callOpenAIJson({
      op: "predict",
      patientPacket: packet,
      source,
      schema: "AiPredictionsV1",
    }) : null;
    if (!ai) {
      // enqueue({ userId, patientId, source })
      return NextResponse.json({ status: "queued" }, { status: 202 });
    }
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

    let saved = 0;
    if (rows.length) {
      // propagate inputs_hash to a dedicated column if you add it
      const upsertRows = rows.map(r => ({ ...r, inputs_hash: r.meta?.inputs_hash ?? null }));
      const { error, data } = await supa
        .from("predictions")
        .upsert(upsertRows, { onConflict: "patient_id,label,inputs_hash" })
        .select("id");
      if (error) {
        console.warn("[/api/predict] insert error:", error.message);
      } else {
        saved = data?.length ?? 0;
      }
    }
    return NextResponse.json({ status: "ok", saved }, { status: 202 });
  } catch (e: any) {
    console.error("[/api/predict] fatal:", e?.message || e);
    return NextResponse.json({ status: "error" }, { status: 202 });
  }
}

