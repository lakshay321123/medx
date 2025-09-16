export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildPatientPacket } from "@/lib/aidoc/patient-packet";
import { callOpenAIJson } from "@/lib/aidoc/vendor";

/**
 * HTTP POST handler that generates AI risk predictions for a patient and persists them.
 *
 * Builds a patient packet for the authenticated user, sends it to the AI prediction service,
 * transforms the returned predictions into rows for the `predictions` table, and inserts them.
 *
 * The request body must be JSON with `patientId` (string). Optional `source` (string) defaults to `"recompute"`.
 * Behavior:
 * - If the current user is not authenticated the handler responds with 401 and `{ error: "missing userId" }`.
 * - If `patientId` is not provided the handler responds with 202 and `{ status: "skipped" }`.
 * - On success it responds with 202 and `{ status: "ok", saved: <number_of_rows> }`.
 * - On internal failure it responds with 202 and `{ status: "error" }`.
 *
 * Side effects:
 * - Calls an external AI service to obtain predictions.
 * - May insert one or more rows into the `predictions` table (each row includes patient_id, user_id, domain, label, probability, meta, and created_at).
 *
 * @param req - Incoming HTTP Request whose JSON body contains `{ patientId: string, source?: string }`.
 * @returns A NextResponse JSON payload indicating status and number of saved rows (when applicable).
 */
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

