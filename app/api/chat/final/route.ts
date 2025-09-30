import { NextResponse } from "next/server";
import { ensureMinDelay } from "@/lib/utils/ensureMinDelay";
import { callGroqChat, callOpenAIChat } from "@/lib/medx/providers";
import { SYSTEM_DEFAULT_LANG } from "@/lib/prompt/system";
import { normalizeLanguageTag } from "@/lib/i18n/lang";
import { languageInstruction } from "@/lib/ai/prompts/common";

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
  const payload = await req.json();
  const { messages = [], mode } = payload ?? {};
  const requestedLang = typeof payload?.lang === "string" ? payload.lang : undefined;
  const headerLang = req.headers.get("x-user-lang") || req.headers.get("x-lang") || undefined;
  const langInput = (requestedLang && requestedLang.trim()) || (headerLang && headerLang.trim()) || SYSTEM_DEFAULT_LANG;
  const lang = normalizeLanguageTag(langInput);
  const langDirective = languageInstruction(lang);
  const provider = pickProvider(mode);

  if (provider === "groq") {
    const reply = await ensureMinDelay(callGroqChat(messages, { temperature: 0.2, max_tokens: 1200 }));
    return NextResponse.json({ ok: true, provider, reply });
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

  system = [langDirective, system].filter(Boolean).join("\n\n");

  const reply = await ensureMinDelay(callOpenAIChat([{ role: "system", content: system }, ...messages]));
  return new Response(JSON.stringify({ ok: true, provider: "openai", reply }), {
    headers: {
      "content-type": "application/json",
      "x-medx-provider": "openai",
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
    },
  });
}
