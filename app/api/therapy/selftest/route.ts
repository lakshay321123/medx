import { NextResponse } from "next/server";
import { llmCall } from "@/lib/llm/call";
export const runtime = "edge";

export async function GET() {
  try {
    const msg = await llmCall(
      [{ role: "user", content: "Say OK" }],
      { tier: "fast", fallbackTier: "balanced", max_tokens: 5 }
    );
    return NextResponse.json({ status: 200, body: msg?.content || "" });
  } catch (err: any) {
    console.error("LLM_ERROR", err);
    const status = err?.status ?? err?.response?.status ?? 500;
    return NextResponse.json({ error: "LLM request failed" }, { status });
  }
}
