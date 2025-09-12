import { NextResponse } from "next/server";
import { ensureMinDelay } from "@/lib/utils/ensureMinDelay";
import { callGroqChat, callOpenAIChat } from "@/lib/medx/providers";
import { detectAudience, clinicianStyle, patientStyle, maxTokensFor } from "@/lib/medx/audience";

// Optional calculator prelude (safe if absent)
let composeCalcPrelude: any, extractAll: any, canonicalizeInputs: any, computeAll: any;
try {
  // Adjust paths if your engine differs
  ({ composeCalcPrelude } = require("@/lib/medical/engine/prelude"));
  ({ extractAll, canonicalizeInputs } = require("@/lib/medical/engine/extract"));
  ({ computeAll } = require("@/lib/medical/engine/computeAll"));
} catch {}

function pickProvider(mode?: string) {
  const m = (mode || "").toLowerCase();
  return (m === "basic" || m === "casual") ? "groq" : "openai";
}

export async function POST(req: Request) {
  const { messages = [], mode } = await req.json();
  const provider = pickProvider(mode);

  if (provider === "groq") {
    const reply = await ensureMinDelay(callGroqChat(messages, { temperature: 0.2, max_tokens: 1200 }));
    return NextResponse.json({ ok: true, provider, reply });
  }

  // OpenAI final-say path with calculator prelude (if available)
  let system = "Validate all calculations and medical logic before answering. Correct any inconsistencies.\nCRISP: Obey hard limits; no extra lines; no preamble; no conclusions beyond requested sections.";
  if ((process.env.CALC_AI_DISABLE || "0") !== "1") {
    try {
      const lastUser = messages.slice().reverse().find((m: any) => m.role === "user")?.content || "";
      const extracted = extractAll?.(lastUser);
      const canonical = canonicalizeInputs?.(extracted);
      const computed = computeAll?.(canonical);
      const prelude = composeCalcPrelude?.(computed);
      if (prelude) system = `Use and verify these pre-computed values first:\n${prelude}`;
    } catch { /* ignore */ }
  }

  const audience = detectAudience(mode);
  const style = audience === "clinician" ? clinicianStyle : patientStyle;
  const reply = await ensureMinDelay(
    callOpenAIChat([
      { role: "system", content: system },
      { role: "system", content: style },
      ...messages
    ], { max_tokens: maxTokensFor(audience) })
  );
  return new Response(JSON.stringify({ ok: true, provider: "openai", reply }), {
    headers: {
      "content-type": "application/json",
      "x-medx-provider": "openai",
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
    },
  });
}
