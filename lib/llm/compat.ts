// Normalizes arbitrary {role: string, content: string} messages
// into the OpenAI SDK's ChatCompletionMessageParam[] shape.

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const OPENAI_ROLES = new Set(["system", "user", "assistant"] as const);

export type LooseMsg = { role: string; content: string };

export function toOpenAIMessages(messages: LooseMsg[]): ChatCompletionMessageParam[] {
  return messages.map((m) => {
    const role = OPENAI_ROLES.has(m.role as any)
      ? (m.role as "system" | "user" | "assistant")
      : "user";
    return { role, content: m.content } satisfies ChatCompletionMessageParam;
  });
}
