import OpenAI from "openai";

export type Provider = "openai" | "groq";

export const FORCE_OPENAI_HEADER = "x-medx-context";
export const FORCE_OPENAI_VALUE = "aidoc";

export function providerFromRequest(req: Request, fallback: Provider = "groq"): Provider {
  try {
    const header = req.headers.get(FORCE_OPENAI_HEADER)?.toLowerCase();
    if (header === FORCE_OPENAI_VALUE) return "openai";
  } catch {
    // ignore header access errors
  }
  return fallback;
}

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
  options?: { stream?: false; temperature?: number; model?: string; response_format?: any }
): Promise<string>;
export function callOpenAIChat(
  messages: any[],
  options: { stream: true; temperature?: number; model?: string; response_format?: any }
): Promise<Response>;
export async function callOpenAIChat(
  messages: any[],
  {
    stream = false,
    temperature = 0.1,
    model,
    response_format,
  }: { stream?: boolean; temperature?: number; model?: string; response_format?: any } = {},
): Promise<string | Response> {
  const primary = model || process.env.OPENAI_TEXT_MODEL || "gpt-5";
  const fallbacks = (process.env.OPENAI_FALLBACK_MODELS || "gpt-4o,gpt-4o-mini")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const models = [primary, ...fallbacks];
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

  const forbidCustomTemp = /^gpt-5/i.test(primary);
  const tempToUse = forbidCustomTemp ? undefined : temperature;

  const tryNonStream = async (model: string) => {
    const client = new OpenAI({ apiKey: key, baseURL: baseUrl });
    try {
      const payload: Record<string, any> = { model, messages };
      if (tempToUse != null) payload.temperature = tempToUse;
      if (response_format) payload.response_format = response_format;
      const r = await client.chat.completions.create(payload);
      return r?.choices?.[0]?.message?.content ?? "";
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (/temperature/i.test(msg) && /unsupported/i.test(msg)) {
        const retryPayload: Record<string, any> = { model, messages };
        if (response_format) retryPayload.response_format = response_format;
        const r2 = await client.chat.completions.create(retryPayload);
        return r2?.choices?.[0]?.message?.content ?? "";
      }
      throw e;
    }
  };

  const tryStream = async (model: string) => {
    const base = { model, messages, stream: true as const };
    if (response_format) Object.assign(base, { response_format });
    const withTemp = tempToUse == null ? base : { ...base, temperature: tempToUse };
    const post = async (payload: any) =>
      fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

    let res = await post(withTemp);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 400 && /temperature/i.test(txt) && /unsupported/i.test(txt)) {
        res = await post(base);
      }
      if (!res.ok) {
        throw new Error(`OpenAI ${model} stream error ${res.status}: ${txt.slice(0,200)}`);
      }
    }
    return res; // SSE Response
  };

  let lastErr: any;
  for (const m of models) {
    try {
      return stream ? await tryStream(m) : await tryNonStream(m);
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("OpenAI error with all models");
}

export async function callOpenAIJson<T = unknown>(args: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  schema: any;
  model?: string;
  temperature?: number;
  schemaName?: string;
}): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = args.model || process.env.OPENAI_TEXT_MODEL || "gpt-5";
  const forbidCustomTemp = /^gpt-5/i.test(model);
  const temperature = forbidCustomTemp ? undefined : args.temperature ?? 0.1;
  const client = new OpenAI({ apiKey: key, baseURL: baseUrl });
  const response = await client.chat.completions.create({
    model,
    messages: args.messages,
    ...(temperature != null ? { temperature } : {}),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: args.schemaName || "response",
        schema: args.schema,
        strict: true,
      },
    },
  });
  const txt = response?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(txt) as T;
  } catch (err) {
    throw new Error(`OpenAI JSON parse failed: ${(err as Error).message}`);
  }
}

