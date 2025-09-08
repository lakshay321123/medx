export type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };

import { llmCall } from "@/lib/llm/call";
import type { ChatCompletionMessageParam } from "@/lib/llm/types";

/** Keep API compatible: provide thin wrappers that call OpenAI via llmCall. */
export async function groqChat(messages: ChatMsg[], model?: string, temperature = 0.2) {
  // Backward-compatibility: previously Groq; now route to balanced tier.
  const resp = await llmCall(messages as ChatCompletionMessageParam[], {
    tier: "balanced",
    fallbackTier: "smart",
    temperature,
    max_tokens: 1200,
  });
  return resp?.content || "";
}

export async function openaiChat(messages: ChatMsg[], model?: string, temperature = 0.2) {
  const resp = await llmCall(messages as ChatCompletionMessageParam[], {
    tier: "smart",
    fallbackTier: "balanced",
    temperature,
    max_tokens: 1200,
  });
  return resp?.content || "";
}

export async function askLLM({ prompt, mode }:{ prompt: string; mode?: string }) {
  try {
    await fetch('/api/medx', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ query: prompt, mode })
    });
  } catch {
    // no-op
  }
}
