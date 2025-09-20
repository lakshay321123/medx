"use server";

import OpenAI from "openai";

type ResponseFormat = { type: string; [key: string]: any };

type CallLLMArgs = {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  response_format?: ResponseFormat;
};

export async function callLLM({
  system,
  prompt,
  temperature = 0.1,
  maxTokens,
  response_format,
}: CallLLMArgs): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const primary = process.env.OPENAI_TEXT_MODEL || "gpt-5";
  const fallbacks = (process.env.OPENAI_FALLBACK_MODELS || "gpt-4o,gpt-4o-mini")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const models = [primary, ...fallbacks];

  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: prompt },
  ];

  const client = new OpenAI({ apiKey });
  let lastError: unknown;

  for (const model of models) {
    try {
      const forbidCustomTemp = /^gpt-5/i.test(model);
      const payload = {
        model,
        messages,
        max_tokens: maxTokens,
        response_format,
        temperature: forbidCustomTemp ? undefined : temperature,
      } as const;

      const res = await client.chat.completions.create(payload);
      const content = res?.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("LLM call failed");
}

export type { CallLLMArgs };
