import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendMessage } from "@/lib/memory/store";
import { decideContext } from "@/lib/memory/contextRouter";
import { seedTopicEmbedding } from "@/lib/memory/outOfContext";
import { updateSummary, persistUpdatedSummary } from "@/lib/memory/summary";
import { buildPromptContext } from "@/lib/memory/contextBuilder";

import { loadState, saveState } from "@/lib/context/stateStore";
import { extractContext, mergeInto } from "@/lib/context/extractLLM";
import { applyContradictions } from "@/lib/context/updates";
import { loadTopicStack, pushTopic, saveTopicStack, switchTo } from "@/lib/context/topicStack";

// Dummy LLM (replace with real)
async function callLLM(system: string, recent: { role: string; content: string }[], userText: string) {
  return `Demo response for: ${userText}`;
}

export async function POST(req: Request) {
  const { userId, activeThreadId, text, mode, researchOn, clarifySelectId } = await req.json();

  // 1) Context routing (continue/clarify/newThread)
  const decision = await decideContext(userId, activeThreadId, text);

  let threadId = activeThreadId;
  let stack = await loadTopicStack(activeThreadId);

  if (decision.action === "continue") {
    threadId = decision.threadId;
  } else if (decision.action === "newThread") {
    const t = await prisma.chatThread.create({ data: { userId, title: "New topic" } });
    threadId = t.id;
    await seedTopicEmbedding(threadId, text);
    stack = await loadTopicStack(threadId);
    stack = pushTopic(stack, "New topic");
    await saveTopicStack(threadId, stack);
  } else if (decision.action === "clarify") {
    // If UI posted a prior clarify selection, switch. Else return options.
    if (clarifySelectId) {
      stack = switchTo(stack, clarifySelectId);
      await saveTopicStack(activeThreadId, stack);
      threadId = activeThreadId; // stay in same thread but switch topic stack active node
    } else {
      return NextResponse.json({ ok: true, clarify: true, options: decision.candidates });
    }
  }

  // 2) Save user message (+embedding via appendMessage)
  await appendMessage({ threadId, role: "user", content: text });

  // 3) Load & update state (contradictions + extraction)
  let state = await loadState(threadId);
  const { state: withContradictions } = applyContradictions(state, text);
  state = withContradictions;

  const ext = await extractContext(text);        // LLM if available, else heuristics
  state = mergeInto(state, ext);
  await saveState(threadId, state);

  // 4) Build prompt with updated state + topic stack + summary
  const { system, recent } = await buildPromptContext({ threadId, options: { mode, researchOn } });

  // 5) Call LLM
  const assistant = await callLLM(system, recent as any, text);

  // 6) Save assistant + update summary
  await appendMessage({ threadId, role: "assistant", content: assistant });
  const updated = updateSummary("", text, assistant);
  await persistUpdatedSummary(threadId, updated);

  // 7) Natural pacing (2–4s)
  await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));

  return NextResponse.json({ ok: true, threadId, text: assistant });
}
