import OpenAI from "openai";

export async function callGroqChat(messages: any[], options?: { temperature?: number; max_tokens?: number }) {
  const key = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL_ID || "llama3-70b-8192";
  const url = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "") + "/chat/completions";
  if (!key) throw new Error("GROQ_API_KEY missing");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.max_tokens ?? 1200,
      stream: false
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// Overloads: tell TS exactly what comes back
export function callOpenAIChat(
  messages: any[],
  options?: { stream?: false; temperature?: number }
): Promise<string>;
export function callOpenAIChat(
  messages: any[],
  options: { stream: true; temperature?: number }
): Promise<Response>;
export async function callOpenAIChat(
  messages: any[],
  { stream = false, temperature = 0.1 }: { stream?: boolean; temperature?: number } = {}
): Promise<string | Response> {
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5";
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  if (!stream) {
    const client = new OpenAI({ apiKey: key });
    const r = await client.chat.completions.create({ model, temperature, messages });
    return r?.choices?.[0]?.message?.content ?? "";
  }

  // streaming (SSE) via REST
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature, messages, stream: true })
  });
  if (!res.ok) throw new Error(await res.text());
  return res; // Response (SSE)
}
