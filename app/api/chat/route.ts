import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendMessage } from "@/lib/memory/store";
import { decideContext } from "@/lib/memory/contextRouter";
import { seedTopicEmbedding } from "@/lib/memory/outOfContext";
import { updateSummary, persistUpdatedSummary } from "@/lib/memory/summary";
import { buildPromptContext } from "@/lib/memory/contextBuilder";
import { parseIntentAndEntities } from "@/lib/nlu/intent";
import { detectAndApplyUpdates } from "@/lib/memory/updates";

// TODO: replace with your real LLM
async function callLLM(system: string, recent: {role:string;content:string}[], userText: string) {
  return `Demo: understood intent and context for "${userText}".`;
}

export async function POST(req: Request) {
  const { userId, activeThreadId, text, mode, researchOn } = await req.json();

  // 1) Route context
  const decision = await decideContext(userId, activeThreadId, text);
  let threadId = activeThreadId;

  if (decision.action === "continue") {
    threadId = decision.threadId;
  } else if (decision.action === "newThread") {
    const t = await prisma.chatThread.create({ data: { userId, title: "New topic" } });
    threadId = t.id;
    await seedTopicEmbedding(threadId, text);
  } else if (decision.action === "clarify") {
    return NextResponse.json({ ok: true, clarify: true, options: decision.candidates });
  }

  // 2) Save user message
  await appendMessage({ threadId, role: "user", content: text });

  // 3) Detect profile updates (weight, height, diet, etc.)
  await detectAndApplyUpdates(threadId, text);

  // 4) NLU for downstream routing (optional hinting)
  const nlu = parseIntentAndEntities(text);

  // 5) Build context (system + recent + profile memory & summary inside)
  const { system, recent } = await buildPromptContext({
    threadId,
    options: { mode, researchOn },
  });

  // 6) Call LLM
  const assistant = await callLLM(system, recent as any, text);

  // 7) Save assistant & update summary
  await appendMessage({ threadId, role: "assistant", content: assistant });
  const updated = updateSummary("", text, assistant);
  await persistUpdatedSummary(threadId, updated);

  // 8) Natural pacing (2–4s)
  await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));

  return NextResponse.json({ ok: true, threadId, text: assistant, intent: nlu.intent, entities: nlu.entities });
}

