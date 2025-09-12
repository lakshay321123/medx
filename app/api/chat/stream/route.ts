import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll, normalizeCtx } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import crypto from 'crypto';
// import { composeCalcPrelude } from '@/lib/medical/engine/prelude'; // intentionally not used
import { verifyWithOpenAI } from '@/lib/ai/verifyWithOpenAI';
import { cacheGet, cacheSet } from '@/lib/ai/cache';

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

  // dedupe
  const now = Date.now();
  for (const [id, ts] of recentReqs.entries()) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) return new Response(null, { status: 409 });
    recentReqs.set(clientRequestId, now);
  }

  // Groq runtime
  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url = `${base.replace(/\/$/,'')}/chat/completions`;

  // sanitize incoming messages
  let finalMessages = messages.filter((m: any) => m.role !== 'system');

  const latestUserMessage = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || '';
  const rawCtx = extractAll(latestUserMessage ?? '');
  const ctx = normalizeCtx(rawCtx);
  const computed = computeAll(ctx);

  // Crisis promotion logic (unchanged from your latest), plus measured_osm/glucose alias fix:
  const glucose = Number(ctx.glucose ?? ctx.glucose_mg_dl);
  const hco3   = Number(ctx.HCO3 ?? ctx.bicarb ?? ctx.bicarbonate);
  const ph     = Number(ctx.pH);
  const k      = Number(ctx.K ?? ctx.potassium);
  const hyperglycemicCrisis = (Number.isFinite(glucose) && glucose >= 250) && ((Number.isFinite(hco3) && hco3 <= 18) || (Number.isFinite(ph) && ph < 7.30));
  const hyperkalemiaDanger  = Number.isFinite(k) && k >= 6.0;

  const mustShow = new Set<string>([
    'measured_osm_status','osmolar_gap','serum_osm_calc','anion_gap_albumin_corrected',
    'hyponatremia_tonicity','hyperkalemia_severity','potassium_status','dka_severity','hhs_flags',
  ]);
  const promoted = computed.filter(r => r && mustShow.has(r.id));
  const crisisPromoted = (hyperglycemicCrisis || hyperkalemiaDanger) ? promoted : [];

  // JOINT DECISION PROTOCOL (explicitly name GPT-5 as verifier)
  const JOINT_DECISION_RULES = [
    'JOINT DECISION PROTOCOL:',
    '- You (OpenAI GPT-5) and the Calculators work TOGETHER.',
    '- Treat calculator outputs as a first pass; correct any edge/missing-input errors.',
    "- Cross-check physiology: Winter’s, osmolality 275–295 normal, albumin-corrected anion gap, potassium bands, renal flags.",
    '- If conflict exists, use your corrected values.',
    '- Output must be decisive; calculators are data, not directives.',
  ].join('\n');

  // Always include JOINT rules first
  finalMessages = [{ role: 'system', content: JOINT_DECISION_RULES }, ...finalMessages];

  // === GPT-5 VERIFICATION (10s, cached) ===
  const ctxHash = crypto.createHash('sha256').update(JSON.stringify({ ctx, computedVersion: 'v1' })).digest('hex');
  const runVerify = showClinicalPrelude || /trial|research/i.test(mode || '') || computed?.length > 0;

  let verdict = null as Awaited<ReturnType<typeof verifyWithOpenAI>>;

  if (runVerify) {
    verdict = await verifyWithOpenAI({
      mode: String(mode || 'default'),
      ctx,
      computed,
      timeoutMs: 10_000,
      cacheGet,
      cacheSet,
      cacheKey: `verdict:${ctxHash}`
    });
  }

  // Overlay corrections (if any) — GPT-5 has final say
  let blended = computed;
  if (verdict?.corrected_values && typeof verdict.corrected_values === 'object') {
    const byId = new Map(blended.map(r => [r?.id, r]));
    for (const [k, v] of Object.entries(verdict.corrected_values)) {
      // If it matches a calculator id, merge there; else attach as a synthetic row
      const target = byId.get(k);
      if (target) {
        if (v && typeof v === 'object' && 'value' in (v as any)) {
          Object.assign(target, v); // {value, unit, notes[]}
        } else {
          target.value = v as any;
        }
        if ((v as any)?.notes && Array.isArray((v as any).notes)) {
          target.notes = Array.from(new Set([...(target.notes||[]), ...(v as any).notes]));
        }
      } else {
        byId.set(k, { id: k, label: k, value: (v as any)?.value ?? v, unit: (v as any)?.unit, notes: (v as any)?.notes ?? [] });
      }
    }
    blended = Array.from(byId.values());
  }

  // Doc-mode: provide data-only prelude (promoted + filtered)
  if (showClinicalPrelude) {
    const filtered = filterComputedForDocMode(blended, latestUserMessage ?? '');
    const linesSet = new Map([...crisisPromoted, ...filtered].map(r => [r.id, r]));
    const lines = Array.from(linesSet.values()).map(r => {
      const val = r.unit ? `${r.value} ${r.unit}` : String(r.value);
      const notes = r.notes?.length ? ` — ${r.notes.join('; ')}` : '';
      return `${r.label}: ${val}${notes}`;
    });
    if (lines.length) {
      finalMessages = [{ role: 'system', content: lines.join('\n') }, ...finalMessages];
    }
  }

  // Profile context (unchanged)
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

  // === Groq compile ===
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
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(`LLM error: ${err}`, { status: 500 });
  }

  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
  });
}
