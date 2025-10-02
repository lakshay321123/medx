import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { languageDirectiveFor, personaFromPrefs, SYSTEM_DEFAULT_LANG } from '@/lib/prompt/system';
import { extractAll, canonicalizeInputs } from '@/lib/medical/engine/extract';
import { BRAND_NAME } from "@/lib/brand";
import { computeAll } from '@/lib/medical/engine/computeAll';
import {
  detectLabSnapshotIntent,
  formatLabIntentResponse,
  isLabSnapshotEnabled,
  isLabSnapshotHardMode,
  type LabSnapshotIntent,
} from "@/lib/aidoc/labsSnapshot";
import { normalizeAidocThreadType, resolveAidocThreadType } from "@/lib/aidoc/threadType";
// === [MEDX_CALC_ROUTE_IMPORTS_START] ===
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';
// === [MEDX_CALC_ROUTE_IMPORTS_END] ===
import { RESEARCH_BRIEF_STYLE } from '@/lib/styles';

// --- tiny helper: keep only the last N non-system turns (cheap token control)
function takeRecentTurns(
  msgs: Array<{role:'system'|'user'|'assistant'; content:string}>,
  n = 8
) {
  const nonSystem = msgs.filter(m => m.role !== 'system');
  return nonSystem.slice(-n);
}

// Keep doc-mode clinical prelude tight & relevant
function filterComputedForDocMode(items: any[], latestUser: string) {
  const msg = (latestUser || '').toLowerCase();
  const mentions = (s: string) => msg.includes(s);
  const isRespContext = mentions('cough') || mentions('fever') || mentions('cold') || mentions('breath') || mentions('sore throat');
  const needsPEContext = mentions('chest pain') || mentions('pleur') || mentions('shortness of breath') || /\bsob\b/.test(msg);
  return items
    // basic sanity
    .filter((r: any) => r && (Number.isFinite(r.value) || typeof r.value === 'string'))
    // avoid placeholders/surrogates/partials
    .filter((r: any) => {
      const noteStr = (r.notes || []).join(' ').toLowerCase();
      const lbl = String(r.label || '').toLowerCase();
      return !/surrogate|placeholder|phase-1|inputs? needed|partial/.test(noteStr + ' ' + lbl);
    })
    // relevance pruning
    .filter((r: any) => {
      const lbl = String(r.label || '').toLowerCase();
      // allow these in respiratory context
      if (isRespContext && (/(curb-?65|news2|qsofa|sirs|qcsi|sofa)/i.test(lbl))) return true;
      // PERC only if explicit PE context
      if (/(perc)/i.test(lbl)) return needsPEContext;
      // drop unrelated rules/noise
      if (/(glasgow-blatchford|ottawa|ankle|knee|head|rockall|apgar|bishop|pasi|burn|maddrey|fib-4|apri|child-?pugh|meld)/i.test(lbl)) return false;
      // conservative default: keep only a small, high-signal set
      return /(curb-?65|news2|qsofa|sirs)/i.test(lbl);
    });
}
export const runtime = 'edge';

const recentReqs = new Map<string, number>();
 
type WebHit = { title:string; snippet?:string; url:string; source?:string };

export async function POST(req: NextRequest) {
  const reqUrl = new URL(req.url);
  const origin = reqUrl.origin;
  let body: any = {};
  try { body = await req.json(); } catch {}

  const resolvedThreadType = await resolveAidocThreadType({
    explicitType: body?.threadType,
    context: body?.context,
    threadId: body?.threadId,
  });

  const interceptResponse = await maybeHandleStreamLabIntent({
    req,
    origin,
    body,
    resolvedThreadType,
  });
  if (interceptResponse) return interceptResponse;

  const qp = reqUrl.searchParams.get('research');
  const long = reqUrl.searchParams.get('long') === '1';
  const { context, clientRequestId, mode } = body;
  const allowHistory = body?.allowHistory !== false;
  const requestedLang = typeof body?.lang === 'string' ? body.lang : undefined;
  const headerLang = req.headers.get('x-user-lang') || req.headers.get('x-lang') || undefined;
  const langTag = (requestedLang && requestedLang.trim()) || (headerLang && headerLang.trim()) || SYSTEM_DEFAULT_LANG;
  const lang = langTag.toLowerCase();
  const langDirective = languageDirectiveFor(lang);
  const persona = personaFromPrefs(body?.personalization);
  const sysPrelude = [langDirective, persona].filter(Boolean).join('\n\n');

  const research =
    qp === '1' || qp === 'true' || body?.research === true || body?.research === 'true';

  // 1) Gather existing conversation
  const history: Array<{role:'system'|'user'|'assistant'; content:string}> =
    allowHistory && Array.isArray(body?.messages) ? body.messages : [];

  // 2) Determine latest user turn for research sourcing + chat flow
  const recent = takeRecentTurns(history, 8);                 // keep continuity
  const latestUser =
    recent.length && recent[recent.length - 1].role === 'user'
      ? recent.pop()!
      : { role: 'user' as const, content: String(body?.question ?? '').trim() };

  // 3) Build or auto-fetch sources if research is on
  let sources: WebHit[] = Array.isArray(body?.__sources) ? body.__sources as WebHit[] : [];
  console.log('research=', research, 'sources.len=', sources?.length);
  if (research && (!sources || sources.length === 0) && latestUser?.content?.trim()) {
    try {
      const r = await fetch(`${origin}/api/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: latestUser.content }),
        cache: 'no-store',
      });
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        if (Array.isArray(j?.results)) sources = j.results;
      }
    } catch {
      // keep sources empty; model will still answer
    }
  }

  const srcBlock = research && Array.isArray(sources) && sources.length
    ? sources.slice(0, 5)
        .map((s, i) => `[${i + 1}] ${s.title || s.url}\n${s.url}\n${s.snippet ?? ''}`)
        .join('\n\n')
    : '';

  const briefMessages: Array<{role:'system'|'user'|'assistant'; content:string}> =
    research && !long
      ? [
          { role: 'system', content: RESEARCH_BRIEF_STYLE + (srcBlock ? `\n\nSOURCES:\n${srcBlock}` : '') },
          ...recent,             // preserve chat context
          latestUser             // ask the new question
        ]
      : history.length
      ? history
      : [latestUser];

  const latestContent = typeof latestUser?.content === 'string' ? latestUser.content : '';
  const contextRaw = typeof body?.context === 'string' ? body.context : '';
  const normalizedContextType = normalizeAidocThreadType(contextRaw);
  const isAidocContext = normalizedContextType === 'aidoc' || resolvedThreadType === 'aidoc';
  const allowHardIntercept = isLabSnapshotHardMode() && !resolvedThreadType;
  const labIntent: LabSnapshotIntent | null =
    isLabSnapshotEnabled() && latestContent
      ? detectLabSnapshotIntent(latestContent)
      : null;

  if (labIntent && (isAidocContext || allowHardIntercept)) {
    const cookie = req.headers.get('cookie') || '';
    try {
      const summaryRes = await fetch(`${origin}/api/labs/summary?mode=ai-doc`, {
        headers: { cookie },
        cache: 'no-store',
      });
      if (summaryRes.status === 401) {
        return streamTextResponse('Please sign in to view your lab reports.');
      }
      if (!summaryRes.ok) {
        throw new Error(`labs summary failed (${summaryRes.status})`);
      }
      const payload = await summaryRes.json().catch(() => null);
      if (!payload?.ok || !Array.isArray(payload.trend)) {
        throw new Error('invalid lab summary');
      }
      const messageText = formatLabIntentResponse(payload.trend, labIntent);
      return streamTextResponse(messageText);
    } catch (err) {
      const fallback = formatLabIntentResponse([], labIntent, {
        emptyMessage: "I couldn’t load your lab reports right now. Please try again in a bit.",
      });
      return streamTextResponse(fallback);
    }
  }

  // 4) Tighter generation when research brief is active
  const modelOptions = (research && !long)
    ? { temperature: 0.2, top_p: 0.9, max_tokens: 250, response_format: { type: 'json_object' } }
    : { temperature: 0.7, max_tokens: 900 };

  const messages = history.length ? history : [latestUser];
  const showClinicalPrelude = mode === 'doctor' || mode === 'research';
  const now = Date.now();
  for (const [id, ts] of recentReqs.entries()) {
    if (now - ts > 60_000) recentReqs.delete(id);
  }
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) {
      return new Response(null, { status: 409 });
    }
    recentReqs.set(clientRequestId, now);
  }
  const base  = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url = `${base.replace(/\/$/,'')}/chat/completions`;

  if (research && !long) {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: briefMessages,
        stream: true,
        ...modelOptions
      })
    });
    if (!upstream.ok) {
      const err = await upstream.text();
      return new Response(`LLM error: ${err}`, { status: 500 });
    }
    return finalizeAidocStreamResponse({
      upstream,
      req,
      origin,
      intent: labIntent,
      resolvedThreadType,
      contextHint: body?.context,
      latestUserContent: latestContent,
    });
  }

  // === Concision controls (SOFT cap, no cutoffs) ===
  const latestUserMessage =
    (messages || []).filter((m: any) => m.role === 'user').slice(-1)[0]?.content || '';
  const wordCount = (latestUserMessage || '').trim().split(/\s+/).filter(Boolean).length;
  const isShortQuery = wordCount <= 6;
  const briefTopic = /\b(what is|types?|symptoms?|causes?|treatment|home care|prevention|red flags?)\b/i
    .test(latestUserMessage || '');
  const targetWordCap = (mode === 'doctor')
    ? (isShortQuery || briefTopic ? 220 : 360)
    : (isShortQuery || briefTopic ? 180 : 280);
  const brevitySystem = [
    `You are ${BRAND_NAME} chat. Be concise and structured.`,
    `Aim to keep the entire answer under ${targetWordCap} words (SOFT cap).`,
    'If you are finishing a sentence, you may exceed the cap slightly to complete it (≤ +40 words).',
    'Never cut a sentence or bullet mid-way; always end with a complete sentence.',
    'Use bold mini-headers and short bullet points (3–5 bullets).',
    'Focus strictly on the user question—omit generic boilerplate.',
    'End with one short follow-up question (≤10 words) that stays on-topic.',
  ].join('\n');

  let finalMessages = messages.filter((m: any) => m.role !== 'system');
  // Track whether we actually injected filtered computed lines for doc/research modes.
  // The calc prelude should only be added when this is true.
  let hasFilteredComputed = false;
  // Ensure brevity guidance and optional source block
  finalMessages = [{ role: 'system', content: brevitySystem }, ...finalMessages];
  if (srcBlock) {
    finalMessages = [{ role: 'system', content: srcBlock }, ...finalMessages];
  }

  const userText = (messages || []).map((m: any) => m?.content || '').join('\n');
  const ctx = canonicalizeInputs(extractAll(userText));
  const computed = computeAll(ctx);

  if (showClinicalPrelude) {
    const filtered = filterComputedForDocMode(computed, latestUserMessage ?? '');
    if (filtered.length) {
      hasFilteredComputed = true;
      const lines = filtered.map(r => {
        const val = r.unit ? `${r.value} ${r.unit}` : String(r.value);
        const notes = r.notes?.length ? ` — ${r.notes.join('; ')}` : '';
        return `${r.label}: ${val}${notes}`;
      });
      finalMessages = [
        {
          role: 'system',
          content:
            'Use these pre-computed clinical values only if relevant to the question. If inputs are missing, state which values are required and avoid quoting incomplete scores.'
        },
        { role: 'system', content: lines.join('\\n') },
        ...finalMessages,
      ];
    }
  }
  if (context === 'profile') {
    try {
      const origin = req.nextUrl.origin;
      const headers = { cookie: req.headers.get('cookie') || '' } as any;
      const [s, p, pk] = await Promise.all([
        fetch(`${origin}/api/profile/summary`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${origin}/api/profile`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${origin}/api/profile/packet`, { headers }).then(r => r.json()).catch(() => ({ text: '' })),
      ]);
      const sys = profileChatSystem({
        summary: s.summary || s.text || '',
        reasons: s.reasons || '',
        profile: p?.profile || p || null,
        packet: pk.text || '',
      });
      // Combine clinical profile with brevity rules (keeps context + concision)
      finalMessages = [{ role: 'system', content: [sys, brevitySystem].join('\n\n') }, ...finalMessages];
    } catch {}
  }
  // === [MEDX_CALC_PRELUDE_START] ===
  const __calcPrelude = composeCalcPrelude(latestUserMessage ?? "");
  // Only add calc prelude if we actually included filtered computed lines (not merely because
  // a different system message — e.g., brevity/profile — was prepended earlier).
  if (showClinicalPrelude && __calcPrelude && hasFilteredComputed) {
    finalMessages = [{ role: 'system', content: __calcPrelude }, ...finalMessages];
  }
  // === [MEDX_CALC_PRELUDE_END] ===

  const systemMessages = finalMessages.filter((m: any) => m.role === 'system');
  const nonSystemMessages = finalMessages.filter((m: any) => m.role !== 'system');
  const combinedSystem = systemMessages.map((m: any) => m.content).filter(Boolean).join('\n\n');
  const finalSystem = [combinedSystem, sysPrelude].filter(Boolean).join('\n\n');
  finalMessages = finalSystem ? [{ role: 'system', content: finalSystem }, ...nonSystemMessages] : nonSystemMessages;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      // Token cap with buffer to avoid API truncation while honoring SOFT word cap
      max_tokens: Math.min(768, Math.max(200, Math.round((targetWordCap + 40) * 1.7))),
      stream: true,
      temperature: 0.4,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    })
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(`LLM error: ${err}`, { status: 500 });
  }

  // Pass-through SSE; frontend parses "data: {delta.content}"
  return finalizeAidocStreamResponse({
    upstream,
    req,
    origin,
    intent: labIntent,
    resolvedThreadType,
    contextHint: body?.context,
    latestUserContent: latestContent,
  });
}

type FinalizeParams = {
  upstream: Response;
  req: NextRequest;
  origin: string;
  intent: LabSnapshotIntent | null;
  resolvedThreadType: string | null;
  contextHint: unknown;
  latestUserContent: string;
};

const LEGACY_MARKERS = [
  /on the provided packet and snapshot/i,
  /patient reports/i,
  /patient overview/i,
  /follow-up question:/i,
  /what is your primary concern/i,
  /what would you like to focus on next\?/i,
  /profile json/i,
];

async function finalizeAidocStreamResponse({
  upstream,
  req,
  origin,
  intent,
  resolvedThreadType,
  contextHint,
  latestUserContent,
}: FinalizeParams): Promise<Response> {
  const normalizedContext = normalizeAidocThreadType(contextHint);
  const treatAsAidoc =
    resolvedThreadType === 'aidoc' ||
    normalizedContext === 'aidoc' ||
    (isLabSnapshotHardMode() && !resolvedThreadType);

  if (!treatAsAidoc) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
      },
    });
  }

  if (intent) {
    try {
      await upstream.body?.cancel?.();
    } catch {}
    return buildAidocStreamLabResponse({ req, origin, intent });
  }

  const rawPayload = await upstream.text();
  const outgoingText = extractAssistantTextFromSse(rawPayload);

  const hasLegacyMarker = containsLegacyMarker(rawPayload) || containsLegacyMarker(outgoingText);
  if (hasLegacyMarker) {
    const fallbackIntent: LabSnapshotIntent =
      detectLabSnapshotIntent(latestUserContent) ?? { kind: 'snapshot' };
    return buildAidocStreamLabResponse({ req, origin, intent: fallbackIntent });
  }

  return new Response(rawPayload, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

function containsLegacyMarker(text: string): boolean {
  if (!text) return false;
  return LEGACY_MARKERS.some((pattern) => pattern.test(text));
}

function extractAssistantTextFromSse(payload: string): string {
  if (!payload) return '';
  const lines = payload.split(/\n/);
  let aggregate = '';
  for (const line of lines) {
    if (!line.startsWith('data:')) continue;
    const value = line.slice(5).trim();
    if (!value || value === '[DONE]') continue;
    try {
      const parsed = JSON.parse(value);
      const choices = Array.isArray(parsed?.choices) ? parsed.choices : [];
      for (const choice of choices) {
        const delta = choice?.delta;
        if (delta && typeof delta.content === 'string') {
          aggregate += delta.content;
        }
      }
    } catch {}
  }
  return aggregate;
}

async function buildAidocStreamLabResponse({
  req,
  origin,
  intent,
}: {
  req: NextRequest;
  origin: string;
  intent: LabSnapshotIntent;
}): Promise<Response> {
  const cookie = req.headers.get('cookie') || '';
  try {
    const summaryRes = await fetch(`${origin}/api/labs/summary?mode=ai-doc`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (summaryRes.status === 401) {
      return streamTextResponse('Please sign in to view your lab reports.');
    }
    if (!summaryRes.ok) {
      throw new Error(`labs summary failed (${summaryRes.status})`);
    }
    const payload = await summaryRes.json().catch(() => null);
    if (!payload?.ok || !Array.isArray(payload.trend)) {
      throw new Error('invalid lab summary');
    }
    const messageText = formatLabIntentResponse(payload.trend, intent);
    return streamTextResponse(messageText);
  } catch (err) {
    console.error('[aidoc-labs] final gate failure', err);
    const fallback = formatLabIntentResponse([], intent, {
      emptyMessage: "I couldn’t load your lab reports right now. Please try again in a bit.",
    });
    return streamTextResponse(fallback);
  }
}

function streamTextResponse(text: string) {
  const payload =
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n` +
    "data: [DONE]\n\n";
  return new Response(payload, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}

type StreamInterceptParams = {
  req: NextRequest;
  origin: string;
  body: any;
  resolvedThreadType?: string | null;
};

async function maybeHandleStreamLabIntent({ req, origin, body, resolvedThreadType }: StreamInterceptParams): Promise<Response | null> {
  if (!isLabSnapshotEnabled()) return null;

  const latestContent = extractLatestUserContent(body);
  if (!latestContent) return null;

  const intent = detectLabSnapshotIntent(latestContent);
  if (!intent) return null;

  const resolvedType =
    resolvedThreadType ??
    (await resolveAidocThreadType({
      explicitType: body?.threadType,
      context: body?.context,
      threadId: body?.threadId,
    }));
  const allowHard = isLabSnapshotHardMode() && !resolvedType;
  if (resolvedType !== "aidoc" && !allowHard) {
    return null;
  }

  const intentLabel = intent.kind === "snapshot" ? "snapshot" : `compare:${intent.metric.label}`;
  const threadTypeLabel = resolvedType ?? normalizeAidocThreadType(body?.context) ?? "unknown";
  const threadId = typeof body?.threadId === "string" ? body.threadId : undefined;

  console.log("[aidoc-labs] intercept", {
    flag: process.env.AIDOC_FORCE_INTERCEPT ?? "0",
    hardFlag: process.env.AIDOC_FORCE_INTERCEPT_HARD ?? "0",
    threadType: threadTypeLabel,
    intent: intentLabel,
    threadId,
  });

  const cookie = req.headers.get('cookie') || '';
  try {
    const summaryRes = await fetch(`${origin}/api/labs/summary?mode=ai-doc`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (summaryRes.status === 401) {
      return streamTextResponse('Please sign in to view your lab reports.');
    }
    if (!summaryRes.ok) {
      throw new Error(`labs summary failed (${summaryRes.status})`);
    }
    const payload = await summaryRes.json().catch(() => null);
    if (!payload?.ok || !Array.isArray(payload.trend)) {
      throw new Error('invalid lab summary');
    }
    const messageText = formatLabIntentResponse(payload.trend, intent);
    return streamTextResponse(messageText);
  } catch (err) {
    console.error('[aidoc-labs] intercept labs failure', err);
    const fallback = formatLabIntentResponse([], intent, {
      emptyMessage: "I couldn’t load your lab reports right now. Please try again in a bit.",
    });
    return streamTextResponse(fallback);
  }
}

function extractLatestUserContent(body: any): string {
  if (Array.isArray(body?.messages)) {
    for (let i = body.messages.length - 1; i >= 0; i -= 1) {
      const entry = body.messages[i];
      if (entry && entry.role === 'user' && typeof entry.content === 'string') {
        const trimmed = entry.content.trim();
        if (trimmed) return trimmed;
      }
    }
  }

  const candidates = [body?.question, body?.message, body?.text, body?.input];
  for (const value of candidates) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }

  return '';
}
