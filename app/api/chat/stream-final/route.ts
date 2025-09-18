import { ensureMinDelay, minDelayMs } from "@/lib/utils/ensureMinDelay";
import { callOpenAIChat } from "@/lib/medx/providers";
import { runHybridPatientAnswer } from "@/lib/medx/patientHybrid";

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
  const { messages = [], mode, context } = await req.json();

  const normalizedMode = (mode || "").toLowerCase();
  if (normalizedMode === "patient") {
    const { text, provider } = await runHybridPatientAnswer({ messages, context });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunk = JSON.stringify({
          choices: [
            {
              delta: { content: text },
              finish_reason: "stop",
              index: 0,
            },
          ],
        });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "x-medx-provider": provider,
        "x-medx-model":
          provider === "openai"
            ? process.env.OPENAI_TEXT_MODEL || "gpt-5"
            : process.env.LLM_MODEL_ID || "llama3-70b-8192",
      },
    });
  }

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
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "x-medx-provider": "openai",
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5"
    }
  });
}
