import { callOpenAIChat } from "@/lib/llm/openai";
import { callGroqChat } from "@/lib/llm/groq";
import type { ChatCompletionMessageParam } from "@/lib/llm/types";

export async function callAiDocWithFallback(params: {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
}) {
  const temperature = params.temperature ?? 0.2;
  try {
    const reply = await callOpenAIChat({
      messages: params.messages,
      model: params.model || process.env.OPENAI_TEXT_MODEL || "gpt-5",
      temperature,
    });
    return { reply, provider: "openai" as const };
  } catch (err: any) {
    console.error("OpenAI failed, falling back to Groq:", err?.message || err);
    const reply = await callGroqChat({
      messages: params.messages,
      temperature,
    });
    return { reply, provider: "groq" as const };
  }
}
