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
export function callOpenAIChat(messages: any[], opt?: { stream?: false; temperature?: number; max_tokens?: number }): Promise<string>;
export function callOpenAIChat(messages: any[], opt: { stream: true;  temperature?: number; max_tokens?: number }): Promise<Response>;
export async function callOpenAIChat(messages: any[], { stream=false, temperature=0.1, max_tokens }: any = {}) {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("OPENAI_API_KEY missing");
  const models = [process.env.OPENAI_TEXT_MODEL || "gpt-5", ...(process.env.OPENAI_FALLBACK_MODELS || "gpt-4o,gpt-4o-mini").split(",").map(s=>s.trim()).filter(Boolean)];

  const tryNonStream = async (model: string) => {
    const client = new OpenAI({ apiKey: key });
    try {
      const r = await client.chat.completions.create({ model, temperature, messages, max_tokens });
      return r?.choices?.[0]?.message?.content ?? "";
    } catch (e: any) {
      if (/temperature/i.test(String(e)) && /unsupported/i.test(String(e))) {
        const r = await client.chat.completions.create({ model, messages, max_tokens });
        return r?.choices?.[0]?.message?.content ?? "";
      }
      throw e;
    }
  };

  const tryStream = async (model: string) => {
    const post = (payload: any) => fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let res = await post({ model, messages, stream: true, temperature, max_tokens });
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      if (res.status === 400 && /temperature/i.test(txt) && /unsupported/i.test(txt)) {
        res = await post({ model, messages, stream: true, max_tokens });
      }
      if (!res.ok) throw new Error(`OpenAI ${model} stream error ${res.status}: ${txt.slice(0,200)}`);
    }
    return res;
  };

  let last: any;
  for (const m of models) {
    try { return stream ? await tryStream(m) : await tryNonStream(m); } catch (e) { last = e; }
  }
  throw last || new Error("OpenAI error with all models");
}

