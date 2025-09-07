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
import { parseConstraintsFromText, mergeLedger } from "@/lib/context/constraints";
import { callGroq } from "@/lib/llm/groq";
import type { ChatCompletionMessageParam } from "@/lib/llm/types";
import { polishText } from "@/lib/text/polish";
import { buildConstraintRecap } from "@/lib/text/recap";

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

  // 3) Update state (contradictions + heuristics extraction; no OpenAI required)
  let state = await loadState(threadId);
  const { state: withContradictions } = applyContradictions(state, text);
  state = withContradictions;

  const ext = await extractContext(text);
  state = mergeInto(state, ext);

  // NEW: parse constraint deltas from this user turn
  const delta = parseConstraintsFromText(text);
  state.constraints = mergeLedger(state.constraints, delta);

  await saveState(threadId, state);

  // 4) Build system + recent messages
  const { system, recent } = await buildPromptContext({ threadId, options: { mode, researchOn } });

  // 5) Groq call
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...recent.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: text },
  ];
  let assistant = await callGroq(messages, { temperature: 0.2, max_tokens: 1200 });

  // 6) Polish and append recap (if any constraints present)
  assistant = polishText(assistant);
  const recap = buildConstraintRecap(state.constraints);
  if (recap) assistant += recap;

  // 7) Save assistant + summary
  await appendMessage({ threadId, role: "assistant", content: assistant });
  const updated = updateSummary("", text, assistant);
  await persistUpdatedSummary(threadId, updated);

  // 8) Optional natural pacing (2–4s)
  await new Promise(r => setTimeout(r, 1800 + Math.random() * 1200));

  return NextResponse.json({ ok: true, threadId, text: assistant });
}
