export const runtime = "edge";
export const dynamic = "force-dynamic";
export const preferredRegion = ["bom1", "sin1", "hnd1"];

import { NextResponse } from "next/server";
import { createParser } from "eventsource-parser";
import { prisma } from "@/lib/prisma";
import { appendMessage } from "@/lib/memory/store";
import { decideContext } from "@/lib/memory/contextRouter";
import { seedTopicEmbedding } from "@/lib/memory/outOfContext";
import { updateSummary, persistUpdatedSummary } from "@/lib/memory/summary";
import { buildPromptContext } from "@/lib/memory/contextBuilder";
import {
  buildSystemPrompt,
  languageNameFor,
  personaFromPrefs,
  sanitizePersonalization,
  SYSTEM_DEFAULT_LANG,
} from "@/lib/prompt/system";
import { buildContextBundle } from "@/lib/prompt/contextBuilder";

import { loadState, saveState } from "@/lib/context/stateStore";
import { EMPTY_STATE } from "@/lib/context/state";
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
import { searchNearby } from "@/lib/openpass";

type WebHit = { title: string; snippet: string; url: string; source: string };

async function runAggregator(req: Request, query: string): Promise<WebHit[]> {
  try {
    const origin = new URL(req.url).origin;
    const r = await fetch(`${origin}/api/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
      cache: 'no-store'
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.results ?? []) as WebHit[];
  } catch {
    return [];
  }
}

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

type StreamOptions = {
  messages: ChatCompletionMessageParam[];
  conversationId: string;
  threadId?: string | null;
  userText: string;
  state: any;
  metadata: Record<string, any>;
  researchSources: WebHit[];
  temperature?: number;
  maxTokens?: number;
  persist?: boolean;
};

async function streamGroqResponse({
  messages,
  conversationId,
  threadId,
  userText,
  state,
  metadata,
  researchSources,
  temperature = 0.25,
  maxTokens = 1200,
  persist = true,
}: StreamOptions): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  const providerEndpoint = "https://api.groq.com/openai/v1/chat/completions";
  const model = process.env.GROQ_DEFAULT_MODEL || "llama3-70b-8192";

  async function finalize(raw: string) {
    let assistant = raw;
    assistant = polishText(assistant);
    const check = selfCheck(assistant, state?.constraints, state?.entities);
    assistant = check.fixed;
    assistant = addEvidenceAnchorIfMedical(assistant);
    const recap = buildConstraintRecap(state?.constraints);
    if (recap) assistant += recap;
    assistant = sanitizeLLM(assistant);
    assistant = finalReplyGuard(userText, assistant);
    if (persist && threadId) {
      try {
        await appendMessage({ threadId, role: "assistant", content: assistant });
        const updated = updateSummary("", userText, assistant);
        await persistUpdatedSummary(threadId, updated);
      } catch (err) {
        console.error("[chat] failed to persist assistant turn", err);
      }
    }
    return assistant;
  }

  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  headers.set("x-conversation-id", conversationId);

  if (!apiKey) {
    const lastUser = messages
      .slice()
      .reverse()
      .find((m) => m.role === "user");
    const fallback = typeof lastUser?.content === "string" && lastUser.content
      ? `Mock response: ${lastUser.content}`
      : "Mock response";
    const sanitized = await finalize(fallback);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(": ping\n\n"));
        const payload = {
          choices: [{ delta: { content: sanitized, medx_reset: true, medx_sources: researchSources } }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, { headers });
  }

  const upstream = await fetch(providerEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      metadata,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || "Upstream error", { status: upstream.status || 500, headers });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let aggregated = "";
      let doneReceived = false;
      const parser = createParser((event) => {
        if (event.type !== "event") return;
        const data = event.data;
        if (data === "[DONE]") {
          doneReceived = true;
          return;
        }
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        try {
          const json = JSON.parse(data);
          const deltaNode = json?.choices?.[0]?.delta;
          const resetStream = deltaNode?.medx_reset === true;
          const delta = typeof deltaNode?.content === "string" ? deltaNode.content : "";
          if (resetStream) {
            aggregated = delta || "";
          } else if (delta) {
            aggregated += delta;
          }
        } catch {
          /* ignore parse errors */
        }
      });

      (async () => {
        controller.enqueue(encoder.encode(": ping\n\n"));
        const reader = upstream.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.feed(decoder.decode(value, { stream: true }));
        }
        if (!doneReceived) {
          // ensure parser sees a DONE marker so finalize runs once
          parser.feed("data: [DONE]\n\n");
        }
        const sanitized = await finalize(aggregated);
        const payload = {
          choices: [{ delta: { content: sanitized, medx_reset: true, medx_sources: researchSources } }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      })().catch((err) => {
        console.error("[chat] stream error", err);
        controller.error(err);
      });
    },
  });

  return new Response(stream, { headers });
}

export async function POST(req: Request) {
  const body: any = await req.json().catch(() => ({}));
  const { personalization, include } = body;
  const allowHistory = body?.allowHistory !== false;
  const includeMemories = allowHistory && !!include?.memories;
  const includeChatHistory = allowHistory && include?.chatHistory !== false;
  const includeRecordHistory = allowHistory && !!include?.recordHistory;
  const { query, locationToken } = body;
  if (query && /near me/i.test(query) && locationToken) {
    const results = await searchNearby(locationToken, query);
    return NextResponse.json({ results });
  }
  const { messages: incomingMessages, mode: rawMode, thread_id } = body;
  const mode = normalizeMode(rawMode);
  const userMessage = incomingMessages?.[incomingMessages.length - 1]?.content || "";
  let { userId, activeThreadId, text, researchOn, clarifySelectId, research } = body;
  if (researchOn === undefined) researchOn = research;
  if (typeof text !== "string" || text.trim() === "") {
    text = typeof userMessage === "string" ? userMessage : "";
  }
  if (researchOn === undefined && (mode === "doctor" || mode === "research")) {
    researchOn = true;
  }

  const headers = req.headers;
  const requestedLang = typeof body?.lang === "string" ? body.lang : undefined;
  const headerLang = headers.get("x-user-lang") || headers.get("x-lang") || undefined;
  const langTag = (requestedLang && requestedLang.trim()) || (headerLang && headerLang.trim()) || SYSTEM_DEFAULT_LANG;
  const lang = langTag.toLowerCase();
  const languageName = languageNameFor(lang);
  const sanitized = sanitizePersonalization(personalization);
  const persona = personaFromPrefs(sanitized);
  let conversationId = headers.get("x-conversation-id");
  let isNewChat = headers.get("x-new-chat") === "true";
  if (!conversationId) {
    conversationId = generateConversationId();
    isNewChat = true;
    console.log("missing_conversation_id");
  }
  const respond = (data: any, init?: ResponseInit) => {
    const res = NextResponse.json(data, init);
    res.headers.set("x-conversation-id", conversationId!);
    return res;
  };
  if (isNewChat) {
    console.log("new_chat_started", { conversationId });
  }
  const ISOLATE = process.env.NEW_CHAT_ISOLATION !== "false";
  const ALLOW_ROLL = process.env.ALLOW_CONTEXT_ROLLFORWARD === "true";
  if (ISOLATE) {
    activeThreadId = conversationId;
    if (isNewChat) {
      await prisma.chatThread.delete({ where: { id: activeThreadId } }).catch(() => {});
    }
  }

  const nctMatch = userMessage.match(/\bNCT\d{8}\b/i);
  if (nctMatch && (mode === "doctor" || mode === "research")) {
    const nctId = nctMatch[0].toUpperCase();
    const trial = await fetchTrialByNct(nctId);
    if (!trial) {
      const msg = `I couldn't find details for ${nctId} right now. Please check the ID or try again later.`;
      return respond({ ok: true, text: msg });
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
    return respond({ ok: true, text: reply });
  }

  // Detect general trial queries (non-NCT)
  if ((mode === "research" || mode === "doctor") && /\btrial(s)?\b/i.test(text)) {
    // --- crude extraction ---
    const conditionMatch = text.match(/(cancer|diabetes|glioblastoma|leukemia|myeloma|lung|breast|colon|prostate|pancreatic|lymphoma)/i);
    const condition = conditionMatch ? conditionMatch[0] : text;

    const phaseMatch = text.match(/phase\s*([1-4])/i);
    const phase = phaseMatch ? phaseMatch[1] : undefined;

    let status: string | undefined;
    if (/recruit/i.test(text)) status = "Recruiting,Enrolling by invitation";
    if (/upcoming|not yet/i.test(text)) status = "Not yet recruiting";

    let country: string | undefined;
    if (/india/i.test(text)) country = "India";
    if (/world|global|international/i.test(text)) country = undefined;
    if (/us|usa|united states/i.test(text)) country = "United States";
    if (country && !byName(country)) country = undefined;

    // --- fetch trials ---
    const trials = await searchTrials({
      query: condition,
      phase,
      status,
      country,
      genes: undefined,
    });

    const ranked = dedupeTrials(trials).sort((a, b) => rankValue(b) - rankValue(a));
    const top = ranked.slice(0, 10);

    if (top.length > 0) {
      // Build trial list string
      const list = top
        .map(
          (t, i) =>
            `${i + 1}. ${t.title} (${t.phase || "?"}, ${t.status || "?"}, ${t.country || "?"})\n   Link: ${t.url}`
        )
        .join("\n\n");

      // Mode-specific prompt
      const prompt =
        mode === "doctor"
          ? `Summarize these trials for a clinician audience. Focus on phase, design, endpoints, status, sponsor.\n\n${list}`
          : `Summarize these trials in plain English for a patient. Explain what each is testing, status, and where. Keep it clear and short.\n\n${list}`;

      const reply = await callGroq([
        {
          role: "system",
          content:
            mode === "doctor"
              ? "You are a clinical evidence summarizer for clinicians."
              : "You are a health explainer for laypeople.",
        },
        { role: "user", content: prompt },
      ]);

      return respond({ ok: true, reply });
    } else {
      return respond({ ok: true, reply: "I couldn't find matching trials right now." });
    }
  }

  // DEBUG LOG (remove later): verify we're actually in Clinical mode path
  console.log("[ClinicalMode] mode=", mode, "thread_id=", thread_id);

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
    return respond({ text: final });
  }

  if (shouldReset(text)) {
    // start new thread logic here
    return respond({ ok: true, threadId: null, text: "Starting fresh. What would you like to do next?" });
  }

  if (!allowHistory) {
    const statelessThreadId = activeThreadId || conversationId!;
    let state = { ...EMPTY_STATE };
    const { state: withContradictions } = applyContradictions(state, text);
    state = withContradictions;

    const ext = await extractContext(text);
    state = mergeInto(state, ext);

    const delta = parseConstraintsFromText(text);
    state.constraints = mergeLedger(state.constraints, delta);

    const entityDelta = parseEntitiesFromText(text);
    state.entities = mergeEntityLedger(state.entities, entityDelta);

    const systemExtra: string[] = [];
    const routeDecision = decideRoute(text, state.topic);
    if (routeDecision === "clarify-quick") {
      systemExtra.push("If the user intent may have changed, ask one concise clarification question, then proceed.");
    }
    if (routeDecision === "switch-topic") {
      state.topic = text.slice(0, 60);
    }

    let researchSources: WebHit[] = [];
    let sourceBlock = '';
    if (researchOn) {
      researchSources = await runAggregator(req, text);
      if (researchSources.length) {
        const top = researchSources.slice(0, 5);
        sourceBlock =
          'Use these up-to-date sources. Prefer them over prior knowledge and include links:\n' +
          top.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`).join('\n\n');
      } else {
        sourceBlock = 'Research mode was ON but no web results were available.';
      }
    }

    const baseSystem = buildSystemPrompt({ lang });
    const systemBlocks: string[] = [baseSystem];
    if (persona) systemBlocks.push(persona);
    if (systemExtra.length) systemBlocks.push(...systemExtra);
    const fullSystem = systemBlocks.filter(Boolean).join("\n\n");

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: fullSystem },
      ...(sourceBlock
        ? ([{ role: "system", content: sourceBlock }] as ChatCompletionMessageParam[])
        : []),
      { role: "user", content: text },
    ];

    const clarifier = disambiguate(text, contextStringFrom(messages));
    if (clarifier) {
      return respond({ ok: true, threadId: statelessThreadId, text: clarifier });
    }

    const feedback_summary = { up: 0, down: 0 };
    const metadata = {
      conversationId: statelessThreadId,
      lastMessageId: null,
      feedback_summary,
      app: "medx",
      mode: mode ?? "chat",
      language: lang,
      languageName,
    };

    return streamGroqResponse({
      messages,
      conversationId: conversationId!,
      threadId: statelessThreadId,
      userText: text,
      state,
      metadata,
      researchSources,
      temperature: 0.25,
      maxTokens: 1200,
      persist: false,
    });
  }

  // 1) Context routing (continue/clarify/newThread)
  const decision =
    ALLOW_ROLL && !ISOLATE
      ? await decideContext(userId, activeThreadId, text)
      : { action: "continue", threadId: activeThreadId } as any;

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
      return respond({ ok: true, clarify: true, options: decision.candidates });
    }
  }

  // ensure thread exists when continuing
  if (decision.action === "continue") {
    const exists = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!exists) {
      const t = await prisma.chatThread.create({ data: { id: threadId, userId, title: "New topic" } });
      threadId = t.id;
      await seedTopicEmbedding(threadId, text);
      stack = await loadTopicStack(threadId);
      stack = pushTopic(stack, "New topic");
      await saveTopicStack(threadId, stack);
    } else if (isNewChat) {
      stack = await loadTopicStack(threadId);
      if (stack.nodes.length === 0) {
        stack = pushTopic(stack, "New topic");
        await saveTopicStack(threadId, stack);
      }
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

  // 4.5) Optional web research
  let researchSources: WebHit[] = [];
  let sourceBlock = '';
  if (researchOn) {
    researchSources = await runAggregator(req, text);
    if (researchSources.length) {
      const top = researchSources.slice(0, 5);
      sourceBlock =
        'Use these up-to-date sources. Prefer them over prior knowledge and include links:\n' +
        top.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`).join('\n\n');
    } else {
      sourceBlock = 'Research mode was ON but no web results were available.';
    }
  }

  // 5) Build system + recent messages
  const { system, recent, langDirective } = await buildPromptContext({
    threadId,
    options: { mode, researchOn, lang, includeHistory: includeChatHistory },
  });
  const contextBlock = [system, ...systemExtra].filter(Boolean).join("\n\n");

  const systemBlocks: string[] = [];
  if (langDirective) systemBlocks.push(langDirective);
  if (persona) systemBlocks.push(persona);
  if (contextBlock) systemBlocks.push(contextBlock);

  // --- Topic Locking disabled (no recipe/dish behaviors) ---
  const fullSystem = systemBlocks.join("\n\n");

  // 6) Groq call
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: fullSystem },
    ...(sourceBlock
      ? ([{ role: "system", content: sourceBlock }] as ChatCompletionMessageParam[])
      : []),
    ...recent.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: text },
  ];
  // Clarification check (stateless)
  const contextString = messages.map((m: any) => m.content).join(" ");
  const clarifier = disambiguate(text, contextString);
  if (clarifier) {
    return respond({ ok: true, threadId, text: clarifier });
  }

  // Clarification check (with memory)
  const bundle = includeMemories
    ? await buildContextBundle(includeRecordHistory ? threadId : undefined)
    : {};
  const clarifierWithMem = includeMemories
    ? disambiguateWithMemory(text, (bundle as any).memories ?? [])
    : undefined;
  if (clarifierWithMem) {
    return respond({ ok: true, threadId, text: clarifierWithMem });
  }
  const feedback_summary = await getFeedbackSummary(threadId || "");
  const metadata = {
    conversationId: threadId,
    lastMessageId: null,
    feedback_summary,
    app: "medx",
    mode: mode ?? "chat",
    language: lang,
    languageName,
  };

  return streamGroqResponse({
    messages,
    conversationId: conversationId!,
    threadId,
    userText: text,
    state,
    metadata,
    researchSources,
    temperature: 0.25,
    maxTokens: 1200,
    persist: true,
  });
}
function generateConversationId() {
  const globalCrypto = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  // Extremely unlikely fallback that keeps us working in older runtimes.
  return `medx-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
