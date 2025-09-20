import { ensureMinDelay, minDelayMs } from "@/lib/utils/ensureMinDelay";
import { callOpenAIChat, FORCE_OPENAI_HEADER, FORCE_OPENAI_VALUE } from "@/lib/medx/providers";

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
  const isAiDoc = req.headers.get(FORCE_OPENAI_HEADER)?.toLowerCase() === FORCE_OPENAI_VALUE;
  const { messages = [], mode } = await req.json();

  // This endpoint is explicitly the OpenAI (final say) stream for non-basic modes.
  // Keep your current /api/chat/stream for Groq/basic.
  let system = "Validate all calculations and medical logic before answering. Correct any inconsistencies.";
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
  const upstream = await ensureMinDelay<Response>(
    callOpenAIChat([{ role: "system", content: system }, ...messages], { stream: true }),
    minMs
  );

  if (!upstream?.ok) {
    const err = upstream ? await upstream.text() : "Upstream error";
    return new Response(`OpenAI stream error: ${err}`, { status: 500 });
  }
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "x-medx-provider": "openai",
    "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
  };
  if (isAiDoc) headers[FORCE_OPENAI_HEADER] = FORCE_OPENAI_VALUE;
  return new Response(upstream.body, { headers });
}
