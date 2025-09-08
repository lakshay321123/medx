import type { ChatCompletionMessageParam } from "./types";
import { withRetries } from "@/lib/llm/retry";

const API_BASE = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const MODEL_PRIMARY = process.env.LLM_MODEL_ID || "llama-3.1-70b-versatile";
const MODEL_FALLBACK = process.env.LLM_FALLBACK_MODEL_ID || "llama-3.1-8b-instant";

export async function callGroq(messages: ChatCompletionMessageParam[], {
  temperature = 0.2,
  max_tokens = 1200,
}: { temperature?: number; max_tokens?: number } = {}) {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error("LLM_API_KEY (Groq) missing");

  const body = {
    model: MODEL_PRIMARY,
    messages,
    temperature,
    max_tokens,
    stream: false,
  } as any;

  const resJson = await withRetries(async () => {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // @ts-ignore
      timeout: 30000,
    });
    if (res.ok) return res.json();
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      const code = j?.error?.code || j?.error?.type;
      if ((res.status === 404 || code === "model_not_found" || code === "invalid_model") && MODEL_FALLBACK && MODEL_FALLBACK !== MODEL_PRIMARY) {
        const res2 = await fetch(`${API_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...body, model: MODEL_FALLBACK }),
        });
        if (res2.ok) return res2.json();
      }
    } catch {}
    throw new Error(`Groq error ${res.status}: ${text}`);
  });
  const content = resJson?.choices?.[0]?.message?.content ?? "";
  return content as string;
}
