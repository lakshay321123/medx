import { NextResponse } from "next/server";
import { withContextRetention } from "@/lib/conversation/middleware";
import { acknowledgmentLayer } from "@/lib/conversation/acknowledgment";
import { disambiguate, disambiguateWithMemory } from "@/lib/conversation/disambiguation";
import { polishResponse } from "@/lib/conversation/polish";
import { shouldReset } from "@/lib/conversation/resetGuard";
import { sanitizeLLM } from "@/lib/conversation/sanitize";
import { finalReplyGuard } from "@/lib/conversation/finalReplyGuard";
import { buildContextBundle } from "@/lib/prompt/contextBuilder";
import { groqChat } from "@/lib/llm";

async function llmReply(messages: any[], mode?: string, thread_id?: string) {
  return groqChat(messages);
}

export const POST = withContextRetention(async (req: Request) => {
  const { messages, mode, thread_id } = await req.json();
  const userMessage = messages[messages.length - 1].content;

  // Explicit reset
  if (shouldReset(userMessage)) {
    return NextResponse.json({ text: "Starting fresh. What would you like to do next?" });
  }

  // Acknowledgment layer
  const ack = acknowledgmentLayer(userMessage);
  if (ack) return NextResponse.json({ text: polishResponse(ack) });

  // Clarification check (stateless)
  const contextString = messages.map((m: any) => m.content).join(" ");
  const clarifier = disambiguate(userMessage, contextString);
  if (clarifier) {
    return NextResponse.json({ text: clarifier });
  }

  // Clarification check with memory
  const bundle = await buildContextBundle(thread_id);
  const clarifierWithMem = disambiguateWithMemory(userMessage, bundle.memories ?? []);
  if (clarifierWithMem) {
    return NextResponse.json({ text: clarifierWithMem });
  }

  // Default → call model
  const raw = await llmReply(messages, mode, thread_id);
  const polished = polishResponse(raw);
  const sanitized = sanitizeLLM(polished);
  const final = finalReplyGuard(userMessage, sanitized);
  return NextResponse.json({ text: final });
});

