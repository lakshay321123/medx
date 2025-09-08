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
import { polishResponse } from "@/lib/conversation/polish";
import { normalizeMode } from "@/lib/conversation/mode";
import { DOCTOR_JSON_SYSTEM, coerceDoctorJson } from "@/lib/conversation/doctorJson";
import { renderDeterministicDoctorReport } from "@/lib/renderer/templates/doctor";
import { buildPatientSnapshot } from "@/lib/patient/snapshot";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchTrialByNct } from "@/lib/trials/byId";
import { singleTrialPatientPrompt, singleTrialClinicianPrompt } from "@/lib/prompts/trials";
import { searchTrials, dedupeTrials, rankValue } from "@/lib/trials/search";
import { byName } from "@/data/countries";

async function getFeedbackSummary(conversationId: string) {
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("ai_feedback")
      .select("rating")
      .eq("conversation_id", conversationId)
      .limit(1000);
    const up = (data ?? []).filter(r => r.rating === 1).length;
    const down = (data ?? []).filter(r => r.rating === -1).length;
    return { up, down };
  } catch {
    return { up: 0, down: 0 };
  }
}

function contextStringFrom(messages: ChatCompletionMessageParam[]): string {
  return messages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ");
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages: incomingMessages, mode: rawMode, thread_id } = body;
  const mode = normalizeMode(rawMode);
  const userMessage = incomingMessages?.[incomingMessages.length - 1]?.content || "";
  let { userId, activeThreadId, text, researchOn, clarifySelectId } = body;
  if (researchOn === undefined && (mode === "doctor" || mode === "research")) {
    researchOn = true;
  }

  const nctMatch = userMessage.match(/\bNCT\d{8}\b/i);
  if (nctMatch && (mode === "doctor" || mode === "research")) {
    const nctId = nctMatch[0].toUpperCase();
    const trial = await fetchTrialByNct(nctId);
    if (!trial) {
      const msg = `I couldn't find details for ${nctId} right now. Please check the ID or try again later.`;
      return NextResponse.json({ ok: true, text: msg });
    }
    const prompt = mode === "doctor"
      ? singleTrialClinicianPrompt(trial)
      : singleTrialPatientPrompt(trial);
    const reply = await callGroq([
      {
        role: "system",
        content:
          mode === "doctor"
            ? "You are a concise clinical evidence summarizer for clinicians."
            : "You explain clinical trials in plain language for laypeople.",
      },
      { role: "user", content: prompt },
    ], { temperature: 0.25, max_tokens: 1200 });
    return NextResponse.json({ ok: true, text: reply });
  }

  // Detect general trial queries
  if ((mode === "research" || mode === "doctor") && /\btrial(s)?\b/i.test(text)) {
    // Condition guess
    const condMatch = text.match(/([A-Za-z ]+?) trial/i);
    const condition = condMatch ? condMatch[1].trim() : text;

    const phaseMatch = text.match(/phase\s*([1-4])/i);
    const phase = phaseMatch ? phaseMatch[1] : undefined;

    let status: string | undefined;
    if (/recruit/i.test(text)) status = "Recruiting,Enrolling by invitation";
    if (/upcoming|not yet/i.test(text)) status = "Not yet recruiting";

    let country: string | undefined;
    if (/india/i.test(text)) country = byName("India")?.name || "India";
    if (/world|global/i.test(text)) country = undefined;
    if (/us|usa|united states/i.test(text)) country = byName("United States")?.name || "United States";

    // Fetch aggregator
    const trials = await searchTrials({
      query: condition,
      phase,
      status,
      country,
    });

    const ranked = dedupeTrials(trials).sort((a, b) => rankValue(b) - rankValue(a));
    const top = ranked.slice(0, 10);

    if (top.length > 0) {
      const list = top
        .map(
          (t, i) =>
            `${i + 1}. ${t.title} (${t.phase || "?"}, ${t.status || "?"}, ${t.country || "?"})\n   Link: ${t.url}`
        )
        .join("\n\n");

      const prompt =
        mode === "doctor"
          ? `Summarize these trials for a clinician. Focus on phase, design, endpoints, and status:\n\n${list}`
          : `Summarize these trials in plain English for patients. Explain what each is testing, status, and where:\n\n${list}`;

      const reply = await callGroq([
        {
          role: "system",
          content:
            mode === "doctor"
              ? "You are a concise clinical trial summarizer for clinicians."
              : "You explain clinical trials in layman terms.",
        },
        { role: "user", content: prompt },
      ]);

      return NextResponse.json({ ok: true, text: reply });
    } else {
      return NextResponse.json({ ok: true, text: "I couldn’t find trials right now." });
    }
  }

  // DEBUG LOG (remove later): verify we're actually in doctor path
  console.log("[DoctorMode] mode=", mode, "thread_id=", thread_id);

  if (mode === "doctor") {
    const patient = await buildPatientSnapshot(thread_id);
    const systemPrompt = DOCTOR_JSON_SYSTEM;
    const msg: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...(incomingMessages || []),
    ];
    const jsonStr = await callGroq(msg, { temperature: 0 });
    const sections = coerceDoctorJson(jsonStr);
    let out = renderDeterministicDoctorReport(patient, sections);
    out = out.replace(/https?:\/\/\S+/g, "");
    out = out.replace(/.*\b(trial|study|research|pubmed|clinicaltrials\.gov|NCI|ICTRP|registry)\b.*\n?/gi, "");
    out = polishResponse(out);
    out = sanitizeLLM(out);
    const final = finalReplyGuard(userMessage, out);
    return NextResponse.json({ text: final });
  }

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
  const feedback_summary = await getFeedbackSummary(threadId || "");
  let assistant = await callGroq(messages, {
    temperature: 0.25,
    max_tokens: 1200,
    metadata: {
      conversationId: threadId,
      lastMessageId: null,
      feedback_summary,
      app: "medx",
      mode: mode ?? "chat",
    },
  });
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
