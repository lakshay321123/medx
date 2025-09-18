import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
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
  const qp = req.nextUrl.searchParams.get('research');
  const long = req.nextUrl.searchParams.get('long') === '1';

  // Read body (may be empty on SSR replays)
  let body: any = {};
  try { body = await req.json(); } catch {}

  // Accept context from body or URL (?context=profile)
  const urlContext  = req.nextUrl.searchParams.get('context');
  const bodyContext = body?.context;
  const context = bodyContext || urlContext || null;

  // Mode fallback
  const mode = body?.mode || req.nextUrl.searchParams.get('mode') || 'patient';

  const clientRequestId = body?.clientRequestId;

  const research =
    qp === '1' || qp === 'true' || body?.research === true || body?.research === 'true';

  // 1) Gather existing conversation
  const history: Array<{role:'system'|'user'|'assistant'; content:string}> =
    Array.isArray(body?.messages) ? body.messages : [];

  // 2) Build source block if research is on
  const sources: WebHit[] = body.__sources ?? [];
  const srcBlock = research && sources.length
    ? sources.slice(0, 5)
        .map((s, i) => `[${i + 1}] ${s.title || s.url}\n${s.url}\n${s.snippet ?? ''}`)
        .join('\n\n')
    : '';

  // 3) Brief message plan: style + (recent history) + latest user
  const recent = takeRecentTurns(history, 8);                 // keep continuity
  const latestUser =
    recent.length && recent[recent.length - 1].role === 'user'
      ? recent.pop()!
      : { role: 'user' as const, content: String(body?.question ?? '').trim() };

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
  let showClinicalPrelude = mode === 'doctor' || mode === 'research';
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
      const cookie = req.headers.get('cookie') || '';
      const base = { headers: { cookie, 'cache-control': 'no-store' } as any };

      // 1) Pull current profile summary + raw profile + packet (no cache)
      let s  = await fetch(`${origin}/api/profile/summary`, { ...base }).then(r => r.json()).catch(() => ({}));
      const p  = await fetch(`${origin}/api/profile`,        { ...base }).then(r => r.json()).catch(() => null);
      const pk = await fetch(`${origin}/api/profile/packet`, { ...base }).then(r => r.json()).catch(() => ({ text: '' }));

      // 2) If summary is empty, compute a prediction and re-fetch summary
      if (!s?.summary && !s?.text) {
        try {
          await fetch(`${origin}/api/predictions/compute`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ threadId: 'med-profile' })
          });
          s = await fetch(`${origin}/api/profile/summary`, { ...base }).then(r => r.json()).catch(() => ({}));
        } catch (e) {
          console.warn('[aidoc] compute-on-demand failed:', (e as any)?.message || e);
        }
      }

      // 3) Build system message from profile+observations+prediction line
      const sys = profileChatSystem({
        summary: s?.summary || s?.text || '',
        reasons: s?.reasons || '',
        profile: p?.profile || p || null,
        packet: pk?.text || '',
      });

      // 4) Ensure clinical prelude shows for Ai Doc conversations too
      showClinicalPrelude =
        mode === 'doctor' || mode === 'research' || context === 'profile';

      finalMessages = [
        { role: 'system', content: [sys, brevitySystem].join('\n\n') },
        ...finalMessages
      ];
    } catch (e) {
      console.warn('[aidoc] profile injection failed:', (e as any)?.message || e);
    }
  }
  // === [MEDX_CALC_PRELUDE_START] ===
  const __calcPrelude = composeCalcPrelude(latestUserMessage ?? "");
  // Only add calc prelude if we actually included filtered computed lines (not merely because
  // a different system message — e.g., brevity/profile — was prepended earlier).
  if (showClinicalPrelude && __calcPrelude && hasFilteredComputed) {
    finalMessages = [{ role: 'system', content: __calcPrelude }, ...finalMessages];
  }
  // === [MEDX_CALC_PRELUDE_END] ===

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
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
  });
}
