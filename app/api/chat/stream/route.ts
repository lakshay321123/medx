import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { personaFromPrefs } from '@/lib/prompt/system';
import { extractAll, canonicalizeInputs } from '@/lib/medical/engine/extract';
import { BRAND_NAME } from "@/lib/brand";
import { computeAll } from '@/lib/medical/engine/computeAll';
import { clamp } from '@/lib/medical/engine/calculators/utils';
// === [MEDX_CALC_ROUTE_IMPORTS_START] ===
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';
// === [MEDX_CALC_ROUTE_IMPORTS_END] ===
import { RESEARCH_BRIEF_STYLE } from '@/lib/styles';
import { SUPPORTED_LANGS } from '@/lib/i18n/constants';
import { STUDY_MODE_SYSTEM, THINKING_MODE_HINT, STUDY_OUTPUT_GUIDE, languageInstruction } from '@/lib/prompts/presets';
import { createLocaleEnforcedStream, enforceLocale } from '@/lib/i18n/enforce';
import { normalizeModeTag } from '@/lib/i18n/normalize';
import { buildFormatInstruction } from '@/lib/formats/build';
import { FORMATS } from '@/lib/formats/registry';
import { isValidLang, isValidMode } from '@/lib/formats/constants';
import { needsTableCoercion } from '@/lib/formats/tableGuard';
import { hasMarkdownTable, sanitizeMarkdownTable, shapeToTable } from '@/lib/formats/tableShape';
import type { FormatId, Mode } from '@/lib/formats/types';

function normalizeLang(raw: string | null | undefined): string {
  const cleaned = (raw || 'en').toLowerCase().split('-')[0].replace(/[^a-z]/g, '');
  return (SUPPORTED_LANGS as readonly string[]).includes(cleaned) ? cleaned : 'en';
}

function readIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    // eslint-disable-next-line no-console
    console.warn(`[AI-Doc] Invalid ${name}="${raw}". Falling back to ${fallback}.`);
    return fallback;
  }
  return n;
}

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

function gateFlagsByMode(
  mode: string | null,
  flags: { study: boolean; thinking: boolean },
) {
  const normalized = (mode || '').toLowerCase();
  const allowedStudy = new Set([
    'wellness',
    'wellness_research',
    'clinical',
    'clinical_research',
    'research',
  ]);
  const allowedThinking = new Set([
    'wellness',
    'wellness_research',
    'clinical',
    'clinical_research',
    'research',
    'aidoc',
  ]);

  return {
    study: flags.study && allowedStudy.has(normalized),
    thinking: flags.thinking && allowedThinking.has(normalized),
  };
}
export const runtime = 'edge';

const recentReqs = new Map<string, number>();
 
type WebHit = { title:string; snippet?:string; url:string; source?:string };

export async function POST(req: NextRequest) {
  const reqUrl = new URL(req.url);
  const origin = reqUrl.origin;
  const qp = reqUrl.searchParams.get('research');
  const long = reqUrl.searchParams.get('long') === '1';
  const studyFlag = reqUrl.searchParams.get('study') === '1';
  const thinkingFlag = reqUrl.searchParams.get('thinking') === '1';
  const formatParam = reqUrl.searchParams.get('formatId');
  const langQuery = reqUrl.searchParams.get('lang');
  let body: any = {};
  try { body = await req.json(); } catch {}
  const { context, clientRequestId, mode } = body;
  const formatFromBody = typeof body?.formatId === 'string' ? body.formatId : undefined;
  const rawModeTag =
    body?.modeTag
    ?? reqUrl.searchParams.get('modeTag')
    ?? body?.mode
    ?? reqUrl.searchParams.get('mode')
    ?? '';
  const normalizedModeTag = normalizeModeTag(rawModeTag);
  const resolvedMode: Mode = isValidMode(normalizedModeTag) ? normalizedModeTag : 'wellness';
  if (process.env.NODE_ENV !== 'production' && !body?.modeTag) {
    // eslint-disable-next-line no-console
    console.warn('[medx] Missing modeTag in request body; falling back to legacy mode:', body?.mode);
  }
  const flags = gateFlagsByMode(resolvedMode, { study: studyFlag, thinking: thinkingFlag });
  const rawFormatId = (formatParam || formatFromBody || '').trim().toLowerCase();
  const formatId = rawFormatId && FORMATS.some(f => f.id === rawFormatId)
    ? (rawFormatId as FormatId)
    : undefined;
  const formatPinned: boolean = body?.formatPinned === true;
  const rawHint = typeof body?.formatHint === 'string'
    ? body.formatHint.trim().toLowerCase()
    : '';
  const formatHint: FormatId | undefined =
    rawHint && FORMATS.some(f => f.id === rawHint) ? (rawHint as FormatId) : undefined;
  const allowHistory = body?.allowHistory !== false;
  const requestedLang = typeof body?.lang === 'string' ? body.lang : null;
  const headerLang = req.headers.get('x-user-lang') || req.headers.get('x-lang') || null;
  const lang = normalizeLang(
    (langQuery && langQuery.trim())
      || (requestedLang && requestedLang.trim())
      || (headerLang && headerLang.trim())
      || null,
  );
  const langDirectiveBlock = languageInstruction(lang);
  // Always build using a safe language fallback to avoid empty-instruction traps
  const safeLang = (isValidLang(lang) ? lang : 'en') as any;
  const formatInstructionFor = (fid?: FormatId) =>
    buildFormatInstruction(safeLang, resolvedMode, fid);
  const isAllowed = (fid?: FormatId) => (fid ? Boolean(formatInstructionFor(fid)) : false);

  const effectiveFormatId: FormatId | undefined = (() => {
    if (formatPinned && isAllowed(formatId)) return formatId!;
    if (isAllowed(formatHint)) return formatHint!;
    if (!formatPinned && isAllowed(formatId)) return formatId!;
    return undefined; // mode default
  })();

  const formatInstruction = buildFormatInstruction(safeLang, resolvedMode, effectiveFormatId);
  const persona = personaFromPrefs(body?.personalization);
  const sysPrelude = [persona].filter(Boolean).join('\n\n');
  const studyChunks = flags.study ? [STUDY_MODE_SYSTEM.trim(), STUDY_OUTPUT_GUIDE.trim()] : [];
  const thinkingChunks = flags.thinking ? [THINKING_MODE_HINT.trim()] : [];
  const thinkingGuard = flags.thinking
    ? [`Headings and section labels must be in ${lang} only; do not append English parentheticals.`]
    : [];

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

  const formatChunks = formatInstruction ? [formatInstruction] : [];
  const researchSystem = [
    langDirectiveBlock,
    ...studyChunks,
    ...thinkingChunks,
    ...formatChunks,
    ...thinkingGuard,
    RESEARCH_BRIEF_STYLE + (srcBlock ? `\n\nSOURCES:\n${srcBlock}` : ''),
    sysPrelude,
  ].filter(Boolean).join('\n\n');

  const briefMessages: Array<{role:'system'|'user'|'assistant'; content:string}> =
    research && !long
      ? [
          { role: 'system', content: researchSystem },
          ...recent,             // preserve chat context
          latestUser             // ask the new question
        ]
      : history.length
      ? history
      : [latestUser];

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
    return new Response(upstream.body, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
    });
  }

  // === Concision controls (SOFT cap, no cutoffs) ===
  const latestUserMessage =
    (messages || []).filter((m: any) => m.role === 'user').slice(-1)[0]?.content || '';
  const wordCount = (latestUserMessage || '').trim().split(/\s+/).filter(Boolean).length;
  const isShortQuery = wordCount <= 6;
  const briefTopic = /\b(what is|types?|symptoms?|causes?|treatment|home care|prevention|red flags?)\b/i
    .test(latestUserMessage || '');
  const isDoctorLike = mode === 'doctor';
  const isAiDoc = resolvedMode === 'aidoc';
  const targetWordCap = (isAiDoc || isDoctorLike)
    ? (isShortQuery || briefTopic ? 220 : 360)
    : (isShortQuery || briefTopic ? 180 : 280);
  const AIDOC_MAX_TOKENS = readIntEnv('AIDOC_MAX_TOKENS', 3000);
  const targetMax = Math.round((targetWordCap + 40) * 1.7);
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
  const finalSystem = [
    langDirectiveBlock,
    ...studyChunks,
    ...thinkingChunks,
    ...formatChunks,
    ...thinkingGuard,
    combinedSystem,
    sysPrelude,
  ].filter(Boolean).join('\n\n');
  finalMessages = finalSystem ? [{ role: 'system', content: finalSystem }, ...nonSystemMessages] : nonSystemMessages;

  const requestedMaxTokens = typeof body?.max_tokens === 'number' ? body.max_tokens : undefined;
  const defaultMaxTokens = typeof body?.default_max_tokens === 'number' ? body.default_max_tokens : undefined;
  const fallbackDefault = clamp(Math.max(200, targetMax), 200, isAiDoc ? AIDOC_MAX_TOKENS : 768);
  let computedMaxTokens = defaultMaxTokens ?? fallbackDefault;
  if (flags.thinking) {
    const boosted = Math.round(computedMaxTokens * 1.1);
    computedMaxTokens = Math.min(boosted, isAiDoc ? AIDOC_MAX_TOKENS : 900);
  }
  const adjustedMaxTokens = isAiDoc
    ? Math.min(AIDOC_MAX_TOKENS, requestedMaxTokens ?? computedMaxTokens ?? AIDOC_MAX_TOKENS)
    : Math.min(2048, requestedMaxTokens ?? computedMaxTokens ?? fallbackDefault);
  const max_tokens = adjustedMaxTokens;
  const temperature = flags.study ? 0.4 : (flags.thinking ? 0.25 : 0.3);

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      // Token cap with buffer to avoid API truncation while honoring SOFT word cap
      max_tokens,
      stream: true,
      temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    })
  });

  const modeAllowsEffective =
    !effectiveFormatId || FORMATS.some(f => f.id === effectiveFormatId && f.allowedModes.includes(resolvedMode));
  const hintAllowsTable =
    (formatHint === 'table_compare') &&
    FORMATS.some(f => f.id === 'table_compare' && f.allowedModes.includes(resolvedMode));

  // Fire if either the chosen format is a table OR the (allowed) hint requested a table.
  const shouldCoerceToTable =
    (modeAllowsEffective && needsTableCoercion(effectiveFormatId)) || hintAllowsTable;

  if (shouldCoerceToTable) {
    const rawSse = await upstream.text();
    if (!upstream.ok) {
      return new Response(rawSse || 'LLM error', { status: upstream.status || 500 });
    }

    const fullText = rawSse
      .split(/\n\n/)
      .map(line => line.replace(/^data:\s*/, ''))
      .filter(Boolean)
      .filter(line => line !== '[DONE]')
      .map(chunk => {
        try {
          return JSON.parse(chunk)?.choices?.[0]?.delta?.content ?? '';
        } catch {
          return '';
        }
      })
      .join('');

    const subject = (latestUserMessage || '').split('\n')[0]?.trim() || 'Comparison';
    let table = sanitizeMarkdownTable(shapeToTable(subject, fullText));
    table = enforceLocale(table, lang, { forbidEnglishHeadings: true });
    const payload = {
      choices: [{ delta: { content: table, medx_reset: true } }],
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
  }

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(`LLM error: ${err}`, { status: 500 });
  }

  if (!upstream.body) {
    return new Response('LLM error: empty body', { status: 500 });
  }

  const formatFinalizer = shouldCoerceToTable
    ? (text: string) => {
        if (hasMarkdownTable(text)) return text;
        const subject = (latestUserMessage || '').split('\n')[0]?.trim() || 'Comparison';
        return sanitizeMarkdownTable(shapeToTable(subject, text));
      }
    : undefined;

  const enforcedStream = createLocaleEnforcedStream(upstream.body, lang, {
    forbidEnglishHeadings: true,
    finalizer: formatFinalizer,
  });

  return new Response(enforcedStream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
  });
}
