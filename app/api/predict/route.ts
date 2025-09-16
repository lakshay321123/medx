export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function toPacket(rows: any[]) {
  return rows.map(r => ({
    name: r.name ?? r.metric ?? r.test ?? r.details?.label ?? r.meta?.label ?? "observation",
    value: r.value ?? r.details?.value ?? r.meta?.value ?? null,
    unit:  r.unit  ?? r.details?.unit  ?? r.meta?.unit  ?? null,
    observed_at:
      r.report_date ?? r.meta?.report_date ?? r.details?.report_date ??
      r.observed_at ?? r.observedAt ??
      r.recorded_at ?? r.measured_at ?? r.taken_at ?? r.sampled_at ??
      r.timestamp   ?? r.created_at  ?? r.createdAt ?? null,
    flags: Array.isArray(r.flags) ? r.flags : (Array.isArray(r.meta?.flags) ? r.meta.flags : []),
    source: r.meta?.source ?? null,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { source = "recompute" } = await req.json().catch(() => ({} as any));
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });

    const db = supabaseAdmin();

    // 1) Read committed observations for this user (matches your profile/timeline filter)
    const { data: obs, error } = await db
      .from("observations")
      .select("*")
      .eq("user_id", userId)
      .eq("meta->>committed", "true");

    if (error) console.warn("[/api/predict] observations error:", error.message);
    const packet = toPacket(Array.isArray(obs) ? obs : []);

    // 2) Ask OpenAI (GPT-5) for per-domain predictions using a strict JSON schema
    const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.AIDOC_MODEL || "gpt-5";

    const PredictionsSchema = {
      name: "PredictionsOut",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          predictions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                domain: { type: "string" },
                name:   { type: "string" },
                label:  { type: "string" },
                score:  { type: "number" },
                top_factors: { type: "array", items: { type: "string" } },
                rationale:   { type: "string" },
              },
              required: ["domain","name","label","score"]
            }
          }
        },
        required: ["predictions"]
      },
      strict: true
    } as const;

    const system = [
      "You are a clinical adjudicator.",
      "Base every numeric decision ONLY on the provided observations (normalized units, timestamps, flags).",
      "Be conservative; never invent numbers; return JSON only.",
    ].join(" ");

    const user = [
      "PATIENT_OBSERVATIONS_JSON:",
      JSON.stringify({ observations: packet }),
    ].join("\n");

    const resp = await oai.responses.create({
      model,
      temperature: 0.1,
      input: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_schema", json_schema: PredictionsSchema },
    } as any);

    const text = (resp as any).output_text || "";
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s >= 0 && e > s) { try { parsed = JSON.parse(text.slice(s, e + 1)); } catch {} }
    }
    const list = Array.isArray(parsed?.predictions) ? parsed.predictions : [];

    // 3) Persist: one row per domain to `predictions` keyed by this user (matches your profile summary expectations)
    if (list.length) {
      const rows = list.map((p: any) => ({
        user_id: userId,
        name: p.name || p.domain || "Prediction",
        probability: typeof p.score === "number" ? p.score : null,
        details: {
          domain: p.domain || null,
          label: p.label || null,
          top_factors: Array.isArray(p.top_factors) ? p.top_factors : [],
          rationale: p.rationale || "",
          model,
          source,
        },
      }));
      const { error: insErr } = await db.from("predictions").insert(rows);
      if (insErr) console.warn("[/api/predict] insert error:", insErr.message);
    }

    return NextResponse.json({ status: "ok", saved: list.length }, { status: 202, headers: noStore });
  } catch (e: any) {
    console.error("[/api/predict] fatal:", e?.message || e);
    return NextResponse.json({ status: "error" }, { status: 202, headers: noStore });
  }
}
