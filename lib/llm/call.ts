import { openai, modelFor, Tier } from "./openai";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function llmCall(
  messages: Msg[],
  opts?: {
    tier?: Tier;                 // "smart" | "balanced" | "fast"
    temperature?: number;
    max_tokens?: number;
    json?: boolean;              // if true, enforce JSON object mode
    fallbackTier?: Tier;         // try another model if first is unavailable
    signal?: AbortSignal;
  }
) {
  const { tier = "smart", temperature = 0.2, max_tokens, json, fallbackTier, signal } = opts || {};
  const primaryModel = modelFor(tier);

  async function call(model: string) {
    const resp = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      ...(json ? { response_format: { type: "json_object" as const } } : {}),
    }, { signal });
    return resp.choices?.[0]?.message; // keep existing message shape for callers
  }

  try {
    return await call(primaryModel);
  } catch (e: any) {
    // Fallback for missing/unauthorized/unavailable model
    const status = e?.status || e?.response?.status;
    if (fallbackTier && (status === 400 || status === 403 || status === 404)) {
      return await call(modelFor(fallbackTier));
    }
    throw e;
  }
}

