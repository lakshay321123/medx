import { NextResponse } from "next/server";
import { ensureMinDelay } from "@/lib/utils/ensureMinDelay";
import { callGroqChat, callOpenAIChat, providerFromRequest, FORCE_OPENAI_HEADER, FORCE_OPENAI_VALUE } from "@/lib/medx/providers";

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
  const provider = providerFromRequest(req, pickProvider(mode));
  const isAiDoc = req.headers.get(FORCE_OPENAI_HEADER)?.toLowerCase() === FORCE_OPENAI_VALUE;

  if (provider === "groq") {
    const reply = await ensureMinDelay(callGroqChat(messages, { temperature: 0.2, max_tokens: 1200 }));
    const headers = new Headers({ "content-type": "application/json" });
    if (isAiDoc) headers.set(FORCE_OPENAI_HEADER, FORCE_OPENAI_VALUE);
    return new NextResponse(JSON.stringify({ ok: true, provider, reply }), { headers });
  }

  // OpenAI final-say path with calculator prelude (if available)
  let system = "Validate all calculations and medical logic before answering. Correct any inconsistencies.";
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

  const reply = await ensureMinDelay(callOpenAIChat([{ role: "system", content: system }, ...messages]));
  const headers = new Headers({
    "content-type": "application/json",
    "x-medx-provider": "openai",
    "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
  });
  if (isAiDoc) headers.set(FORCE_OPENAI_HEADER, FORCE_OPENAI_VALUE);
  return new NextResponse(JSON.stringify({ ok: true, provider: "openai", reply }), {
    headers,
  });
}
