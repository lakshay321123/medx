import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "./types";

export async function callOpenAIChat({
  messages,
  model,
  temperature,
}: {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const client = new OpenAI({ apiKey: key });
  const resolvedModel = model || process.env.OPENAI_TEXT_MODEL || "gpt-5";
  const response = await client.chat.completions.create({
    model: resolvedModel,
    messages,
    temperature: temperature ?? 0.2,
  });

  return response?.choices?.[0]?.message?.content ?? "";
}
