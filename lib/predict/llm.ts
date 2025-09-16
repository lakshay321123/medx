import type { PredictionReport } from "./openai";

const BASE = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.LLM_MODEL_ID || "llama-3.1-8b-instant";
const KEY = process.env.LLM_API_KEY!;

export async function formatWithLLM(pr: PredictionReport): Promise<string> {
  const body = {
    model: MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: "Reformat the given PredictionReport into ≤10 crisp bullet lines. No chit-chat, no disclaimers." },
      { role: "user", content: JSON.stringify(pr) },
    ],
  };

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return "Prediction ready.";
  const json = await res.json();
  return json?.choices?.[0]?.message?.content?.trim() || "Prediction ready.";
}
