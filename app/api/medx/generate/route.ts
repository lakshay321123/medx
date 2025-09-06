import { NextRequest, NextResponse } from "next/server";
import { v2Generate } from "@/lib/medx";
import { routeIntent } from "@/lib/intent-router";
import { evaluateResponseAccuracy } from "@/lib/selfLearning/feedbackLoop";

function extractNaturalText(resp: any) {
  return [
    resp?.answer?.patient?.summary,
    resp?.answer?.doctor?.summary,
    resp?.research?.summary,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function legacyGenerate(body: any) {
  return { ok: true, legacy: true, body };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const routed =
    process.env.MEDX_INTENT_ROUTER === "on" && typeof body.text === "string"
      ? { ...body, ...routeIntent(body.text, body.prev) }
      : body;
  if (
    process.env.MEDX_MODES_V2 === "on" &&
    ["patient", "doctor", "research"].includes(routed.mode)
  ) {
    const started = Date.now();
    const data = await v2Generate(routed);
    if (process.env.ENABLE_FEEDBACK_LOOP === "true") {
      const userInput = routed.text || routed.condition || "";
      await evaluateResponseAccuracy(
        userInput,
        extractNaturalText(data),
        {
          conversationId: routed.threadId ?? routed.conversationId,
          messageId: typeof data === "object" && data && "id" in data ? (data as any).id : undefined,
          mode: routed.mode,
          model: process.env.LLM_MODEL_ID,
          latencyMs: Date.now() - started,
        }
      );
    }
    return NextResponse.json(data);
  }
  const legacy = await legacyGenerate(routed);
  return NextResponse.json(legacy);
}

