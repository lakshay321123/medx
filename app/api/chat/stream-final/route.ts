import { ensureMinDelay, minDelayMs } from "@/lib/utils/ensureMinDelay";
import { callOpenAIChat } from "@/lib/medx/providers";
import {
  detectAudience,
  clinicianStyle,
  patientStyle,
  maxTokensFor,
  clinicianInterpretationStyle,
  needsClinicalInterpretation,
} from "@/lib/medx/audience";

// Optional calculator prelude (safe if engine absent)
let composeCalcPrelude: any, extractAll: any, canonicalizeInputs: any, computeAll: any;
try {
  ({ composeCalcPrelude } = require("@/lib/medical/engine/prelude"));
  ({ extractAll, canonicalizeInputs } = require("@/lib/medical/engine/extract"));
  ({ computeAll } = require("@/lib/medical/engine/computeAll"));
} catch {}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { messages = [], mode } = await req.json();

  // This endpoint is explicitly the OpenAI (final say) stream for non-basic modes.
  // Keep your current /api/chat/stream for Groq/basic.
  let system = "Validate all calculations and medical logic before answering. Correct any inconsistencies.\nCRISP: Obey hard limits; no extra lines; no preamble; no conclusions beyond requested sections.";
  if ((process.env.CALC_AI_DISABLE || "0") !== "1") {
    try {
      const lastUser = messages.slice().reverse().find((m: any) => m.role === "user")?.content || "";
      const extracted = extractAll?.(lastUser);
      const canonical = canonicalizeInputs?.(extracted);
      const computed = computeAll?.(canonical);
      const prelude = composeCalcPrelude?.(computed);
      if (prelude) system = `Use and verify these pre-computed values first:\n${prelude}`;
    } catch {}
  }

  const minMs = minDelayMs();
  const audience = detectAudience(mode);
  const style =
    audience === "clinician"
      ? needsClinicalInterpretation(messages)
        ? clinicianInterpretationStyle
        : clinicianStyle
      : patientStyle;
  const upstream = await ensureMinDelay<Response>(
    callOpenAIChat([
      { role: "system", content: system },
      { role: "system", content: style },
      ...messages
    ], { stream: true, max_tokens: maxTokensFor(audience) }),
    minMs
  );

  if (!upstream?.ok) {
    const err = upstream ? await upstream.text() : "Upstream error";
    return new Response(`OpenAI stream error: ${err}`, { status: 500 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "x-medx-provider": "openai",
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5"
    }
  });
}
