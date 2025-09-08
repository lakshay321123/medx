import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendMessage } from "@/lib/memory/store";
import { decideContext } from "@/lib/memory/contextRouter";
import { seedTopicEmbedding } from "@/lib/memory/outOfContext";
import { updateSummary, persistUpdatedSummary } from "@/lib/memory/summary";
import { buildPromptContext } from "@/lib/memory/contextBuilder";
import { buildContextBundle } from "@/lib/prompt/contextBuilder";

import { loadState, saveState } from "@/lib/context/stateStore";
import { extractContext, mergeInto } from "@/lib/context/extractLLM";
import { applyContradictions } from "@/lib/context/updates";
import { loadTopicStack, pushTopic, saveTopicStack, switchTo } from "@/lib/context/topicStack";
import { parseConstraintsFromText, mergeLedger } from "@/lib/context/constraints";
import { parseEntitiesFromText, mergeEntityLedger } from "@/lib/context/entityLedger";
import { decideRoute } from "@/lib/context/router";
import { callGroq } from "@/lib/llm/groq";
import type { ChatCompletionMessageParam } from "@/lib/llm/types";
import { polishText } from "@/lib/text/polish";
import { buildConstraintRecap } from "@/lib/text/recap";
import { selfCheck } from "@/lib/text/selfCheck";
import { addEvidenceAnchorIfMedical } from "@/lib/text/medicalAnchor";
import { shouldReset } from "@/lib/conversation/resetGuard";
import { sanitizeLLM } from "@/lib/conversation/sanitize";
import { finalReplyGuard } from "@/lib/conversation/finalReplyGuard";
import { disambiguate, disambiguateWithMemory } from "@/lib/conversation/disambiguation";
import { detectTopic, wantsNewTopic, inferTopicFromHistory, seemsOffTopic, rewriteToTopic } from "@/lib/conversation/topic";

function contextStringFrom(messages: ChatCompletionMessageParam[]): string {
  return messages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ");
}

export async function POST(req: Request) {
  const { userId, activeThreadId, text, mode, researchOn, clarifySelectId } = await req.json();

  if (shouldReset(text)) {
    // start new thread logic here
    return NextResponse.json({ ok: true, threadId: null, text: "Starting fresh. What would you like to do next?" });
  }

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

  // NEW: parse entity deltas from user message
  const entityDelta = parseEntitiesFromText(text);
  state.entities = mergeEntityLedger(state.entities, entityDelta);

  await saveState(threadId, state);

  // 4) Decide routing for current turn
  const systemExtra: string[] = [];
  const routeDecision = decideRoute(text, state.topic);
  if (routeDecision === "clarify-quick") {
    systemExtra.push("If the user intent may have changed, ask one concise clarification question, then proceed.");
  }
  if (routeDecision === "switch-topic") {
    state.topic = text.slice(0, 60);
    await saveState(threadId, state);
  }

  // 5) Build system + recent messages
  const { system, recent } = await buildPromptContext({ threadId, options: { mode, researchOn } });
  const baseSystem = [system, ...systemExtra].join("\n");

  // --- Topic Locking & Guarded Continuation (M6.2) ---
  const historyTopic = inferTopicFromHistory(recent.map(m => ({ role: m.role, content: m.content })));
  const userTopic = detectTopic(text);
  const userRequestedNew = wantsNewTopic(text);
  const activeTopic =
    userRequestedNew ? (userTopic || historyTopic) : (historyTopic || userTopic) || null;

  let onTopicInstruction = "";
  if (activeTopic) {
    onTopicInstruction =
      `\nIMPORTANT:\n` +
      `- The user is working on **${activeTopic}**.\n` +
      `- Do NOT switch to a different dish/recipe unless the user explicitly asks.\n` +
      `- If the user says "make it spicy / less spicy / add X", MODIFY the existing **${activeTopic}** recipe accordingly.\n` +
      `- Be concise and keep formatting clean (headers + bullets).\n` +
      `- When adjusting, title the reply with the locked dish, e.g., "Spicy Butter Chicken — Adj".\n`;
  }

  const fullSystem = baseSystem + onTopicInstruction;

  // 6) Groq call
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: fullSystem },
    ...recent.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: text },
  ];
  // Clarification check (stateless)
  const contextString = messages.map((m: any) => m.content).join(" ");
  const clarifier = disambiguate(text, contextString);
  if (clarifier) {
    return NextResponse.json({ ok: true, threadId, text: clarifier });
  }

  // Clarification check (with memory)
  const bundle = await buildContextBundle(threadId);
  const clarifierWithMem = disambiguateWithMemory(text, bundle.memories ?? []);
  if (clarifierWithMem) {
    return NextResponse.json({ ok: true, threadId, text: clarifierWithMem });
  }
  let assistant = await callGroq(messages, { temperature: 0.25, max_tokens: 1200 });
  if (activeTopic && seemsOffTopic(assistant, activeTopic)) {
    assistant = rewriteToTopic(assistant, activeTopic);
  }

  // 6) Polish and append recap (if any constraints present)
  assistant = polishText(assistant);
  const check = selfCheck(assistant, state.constraints, state.entities);
  assistant = check.fixed;
  assistant = addEvidenceAnchorIfMedical(assistant);
  const recap = buildConstraintRecap(state.constraints);
  if (recap) assistant += recap;

  assistant = sanitizeLLM(assistant);
  assistant = finalReplyGuard(text, assistant);

  // 7) Save assistant + summary
  await appendMessage({ threadId, role: "assistant", content: assistant });
  const updated = updateSummary("", text, assistant);
  await persistUpdatedSummary(threadId, updated);

  // 8) Optional natural pacing (2–4s)
  await new Promise(r => setTimeout(r, 1800 + Math.random() * 1200));

  return NextResponse.json({ ok: true, threadId, text: assistant });
}
