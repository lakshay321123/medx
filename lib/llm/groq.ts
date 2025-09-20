import type { ChatCompletionMessageParam } from "./types";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_DEFAULT_MODEL || "llama3-70b-8192";

type CallGroqOptions = {
  temperature?: number;
  max_tokens?: number;
  metadata?: any;
  model?: string;
};

export async function callGroq(
  messages: ChatCompletionMessageParam[],
  { temperature = 0.2, max_tokens = 1200, metadata, model }: CallGroqOptions = {}
) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || MODEL,
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

export async function callGroqChat(params: {
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  model?: string;
}) {
  const { messages, temperature, model } = params;
  return callGroq(messages, { temperature, model });
}
