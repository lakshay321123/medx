import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
// === [MEDX_CALC_ROUTE_IMPORTS_START] ===
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';
// === [MEDX_CALC_ROUTE_IMPORTS_END] ===
const JOINT_DECISION_RULES = [
  "JOINT DECISION PROTOCOL:",
  "- You (OpenAI) and the Calculators work TOGETHER.",
  "- Treat calculator outputs as a first pass. They are fast but can be wrong at edges or due to missing/aliased inputs.",
  "- You MUST cross-check key physiology (Winter’s formula, osmolality banding 275–295 normal, anion-gap logic, potassium bands, renal flags).",
  "- If any calculator output conflicts with physiology, guidelines, or internal consistency, YOU must CORRECT it.",
  "- When you correct something, state briefly: what you corrected and why (1 line), then proceed with the final consolidated answer.",
  "- Your final answer supersedes calculator text if there’s a conflict.",
  "- Be decisive: give the clinical interpretation, risks, and next steps. Avoid quoting raw calculators unless useful.",
].join("\n");
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


export async function POST(req: NextRequest) {
  const { messages = [], context, clientRequestId, mode } = await req.json();
  const showClinicalPrelude = (mode === 'doctor' || mode === 'research');
  const shouldAlwaysShowPrelude = true; // <- force for now; or gate on presence of any lab keys
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

  let finalMessages = messages.filter((m: any) => m.role !== 'system');

  const latestUserMessage = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || "";
  const userText = (messages || []).map((m: any) => m?.content || '').join('\n');
  const ctx = extractAll(userText);
  const computed = computeAll(ctx);

  if (showClinicalPrelude || shouldAlwaysShowPrelude) {
    const filtered = filterComputedForDocMode(computed, latestUserMessage ?? '');
    if (filtered.length) {
      const lines = filtered.map(r => {
        const val = r.unit ? `${r.value} ${r.unit}` : String(r.value);
        const notes = r.notes?.length ? ` — ${r.notes.join('; ')}` : '';
        return `${r.label}: ${val}${notes}`;
      });
      finalMessages = [
        { role: 'system', content: JOINT_DECISION_RULES },
        { role: 'system', content: lines.join('\\n') },
        ...finalMessages,
      ];
    } else {
      finalMessages = [
        { role: 'system', content: JOINT_DECISION_RULES },
        ...finalMessages,
      ];
    }
  } else {
    finalMessages = [
      { role: 'system', content: JOINT_DECISION_RULES },
      ...finalMessages,
    ];
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
      finalMessages = [{ role: 'system', content: sys }, ...finalMessages];
    } catch {}
  }
  // === [MEDX_CALC_PRELUDE_START] ===
  const __calcPrelude = composeCalcPrelude(latestUserMessage ?? "");
  if (__calcPrelude) {
    const idx = finalMessages.findIndex(
      (m: any) => m.role === 'system' && m.content === JOINT_DECISION_RULES
    );
    if (idx >= 0) {
      finalMessages = [
        ...finalMessages.slice(0, idx + 1),
        { role: 'system', content: __calcPrelude },
        ...finalMessages.slice(idx + 1),
      ];
    } else {
      finalMessages = [{ role: 'system', content: __calcPrelude }, ...finalMessages];
    }
  }
  // === [MEDX_CALC_PRELUDE_END] ===

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: finalMessages,
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
