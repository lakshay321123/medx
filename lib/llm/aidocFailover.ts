import { callOpenAIChat } from "@/lib/llm/openai";
import { callGroqChat } from "@/lib/llm/groq";
import { toOpenAIMessages, type LooseMsg } from "@/lib/llm/compat";

type FallbackResult = { reply: string; provider: "openai" | "groq" };

export async function callAiDocWithFallback(params: {
  messages: LooseMsg[];
  model?: string;
  temperature?: number;
}): Promise<FallbackResult> {
  const oaMsgs = toOpenAIMessages(params.messages);
  const temperature = params.temperature ?? 0.2;

  try {
    const res = await callOpenAIChat({
      messages: oaMsgs,
      model: params.model || process.env.OPENAI_TEXT_MODEL || "gpt-5",
      temperature,
    });
    const reply =
      typeof res === "string"
        ? res
        : res?.choices?.[0]?.message?.content ?? (res as any)?.reply ?? "";

    return { reply, provider: "openai" };
  } catch (err: any) {
    console.error("OpenAI failed, falling back to Groq:", err?.message || err);

    const res = await callGroqChat({
      messages: oaMsgs,
      model: process.env.LLM_MODEL_ID || "llama-3.1-70b-8192",
      temperature,
    });
    const reply =
      typeof res === "string"
        ? res
        : res?.choices?.[0]?.message?.content ?? (res as any)?.reply ?? "";

    return { reply, provider: "groq" };
  }
}
