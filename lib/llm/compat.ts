// Normalizes arbitrary {role: string, content: string} messages
// into the OpenAI SDK's ChatCompletionMessageParam[] shape.

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

type OpenAIRole = "system" | "user" | "assistant";

const OPENAI_ROLES = new Set<OpenAIRole>(["system", "user", "assistant"]);

export type AiDocMessage = { role: string; content: string };
export type NormalizedAiDocMessage = { role: OpenAIRole; content: string };

function normalizeRole(role: string | undefined): OpenAIRole {
  return OPENAI_ROLES.has(role as OpenAIRole) ? (role as OpenAIRole) : "user";
}

export function toOpenAIMessages(messages: AiDocMessage[]): ChatCompletionMessageParam[] {
  return messages.map((message) => {
    const role = normalizeRole(message.role);
    const content = typeof message.content === "string" ? message.content : "";

    return { role, content } satisfies ChatCompletionMessageParam;
  });
}
