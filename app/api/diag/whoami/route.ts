import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { mode } = await req.json().catch(() => ({ mode: undefined }));
  const env = {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL || "gpt-5",
    OPENAI_FINAL_SAY: (process.env.OPENAI_FINAL_SAY || "true").toString(),
    GROQ_API_KEY: !!(process.env.GROQ_API_KEY || process.env.LLM_API_KEY),
    LLM_MODEL_ID: process.env.LLM_MODEL_ID || "llama3-70b-8192",
    MIN_OUTPUT_DELAY_SECONDS: process.env.MIN_OUTPUT_DELAY_SECONDS || "10",
    CALC_AI_DISABLE: process.env.CALC_AI_DISABLE || "0",
  };
  const provider = (!mode || String(mode).toLowerCase() === "basic" || String(mode).toLowerCase() === "casual") ? "groq" : "openai";
  const expected = provider === "openai" ? env.OPENAI_TEXT_MODEL : env.LLM_MODEL_ID;

  return NextResponse.json({
    ok: true,
    mode: mode || "(none)",
    provider_expected: provider,
    model_expected: expected,
    env
  });
}

