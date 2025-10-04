import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { languageDirectiveFor, personaFromPrefs, SYSTEM_DEFAULT_LANG } from '@/lib/prompt/system';
import { extractAll, canonicalizeInputs } from '@/lib/medical/engine/extract';
import { BRAND_NAME } from "@/lib/brand";
import { computeAll } from '@/lib/medical/engine/computeAll';
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
  const qp = reqUrl.searchParams.get('research');
  const long = reqUrl.searchParams.get('long') === '1';
  let body: any = {};
  try { body = await req.json(); } catch {}
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

  const isAiDoc = mode === 'doctor';
  const AIDOC_MAX_TOKENS = Number(process.env.AIDOC_MAX_TOKENS || 3000);
  const targetMax = Math.round((targetWordCap + 40) * 1.7);
  const max_tokens = isAiDoc
    ? Math.min(AIDOC_MAX_TOKENS, Math.max(200, targetMax))
    : Math.min(768, Math.max(200, targetMax));

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      // Token cap with buffer to avoid API truncation while honoring SOFT word cap
      max_tokens,
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
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
  });
}
