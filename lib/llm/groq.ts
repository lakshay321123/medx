import type { ChatCompletionMessageParam } from "./types";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_DEFAULT_MODEL || process.env.LLM_MODEL_ID || "llama3-70b-8192";

export async function callGroq(messages: ChatCompletionMessageParam[], {
  temperature = 0.2,
  max_tokens = 1200,
  metadata,
}: { temperature?: number; max_tokens?: number; metadata?: any } = {}) {
  // Backward-compat: allow either GROQ_API_KEY or legacy LLM_API_KEY
  const key = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens,
      stream: false,
      metadata,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return content as string;
}
