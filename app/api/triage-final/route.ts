import { NextRequest, NextResponse } from "next/server";
import { ensureMinDelay } from "@/lib/utils/ensureMinDelay";
import OpenAI from "openai";

let localTriage: any;
try {
  // If you already have lib/triage.ts exporting symptomTriage, we use it.
  ({ symptomTriage: localTriage } = require("@/lib/triage"));
} catch {}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = {
      symptom: (body?.symptom || "").trim(),
      age: body?.age,
      durationDays: body?.durationDays,
      flags: Array.isArray(body?.flags) ? body.flags : undefined,
    };

    // 1) Fast local pass (if available)
    let base: any = null;
    try { base = localTriage ? localTriage(input) : null; } catch {}

    // 2) OpenAI final say (schema-validated)
    const must = (process.env.OPENAI_FINAL_SAY || "true").toLowerCase() === "true";
    if (!must || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: true, source: base ? "local" : "none", triage: base?.triage || base });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const model = process.env.OPENAI_TEXT_MODEL || "gpt-5";

    const schema = {
      name: "SymptomTriageOut",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symptom: { type: "string" },
          possible_causes: { type: "array", items: { type: "string" } },
          self_care: { type: "array", items: { type: "string" } },
          doctor_visit: { type: "array", items: { type: "string" } },
          er_now: { type: "array", items: { type: "string" } },
          assumptions: { type: "array", items: { type: "string" } }
        },
        required: ["symptom","possible_causes","self_care","doctor_visit","er_now"]
      }
    };

    const prompt = [
      { role: "system", content: "You are a cautious medical triage validator. Never under-triage red flags." },
      { role: "user", content: `Input:\n${JSON.stringify(input)}\n\nLocalTriage:\n${JSON.stringify(base?.triage || base || {})}` }
    ];

    const work = client.responses.create({
      model,
      temperature: 0.1,
      input: prompt as any,
      response_format: { type: "json_schema", json_schema: schema as any }
    }).then((r: any) => {
      const text = r?.output_text || "";
      try { return JSON.parse(text); } catch { return base?.triage || base || null; }
    });

    const triage = await ensureMinDelay(work);
    return NextResponse.json({ ok: true, source: "openai_final", triage });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
