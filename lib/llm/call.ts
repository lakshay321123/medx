import { openai, modelFor, type Tier } from "./openai";
import type { ChatCompletionMessageParam } from "@/lib/llm/types";

export async function llmCall(
  messages: ChatCompletionMessageParam[],
  opts?: {
    tier?: Tier;                 // "smart" | "balanced" | "fast"
    temperature?: number;
    max_tokens?: number;
    json?: boolean;              // enforce JSON object mode
    fallbackTier?: Tier;         // try another tier if first fails
    signal?: AbortSignal;
  }
) {
  const {
    tier = "smart",
    temperature = 0.2,
    max_tokens,
    json,
    fallbackTier,
    signal
  } = opts || {};

  const primaryModel = modelFor(tier);

  async function call(model: string) {
    const resp = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      ...(json ? { response_format: { type: "json_object" as const } } : {}),
    }, { signal });
    return resp.choices?.[0]?.message;
  }

  try {
    return await call(primaryModel);
  } catch (e: any) {
    const status = e?.status || e?.response?.status;
    if (fallbackTier && (status === 400 || status === 403 || status === 404)) {
      return await call(modelFor(fallbackTier));
    }
    throw e;
  }
}
