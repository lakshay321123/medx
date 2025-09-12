import { NextRequest, NextResponse } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll, normalizeCtx } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import { verifyWithOpenAI } from '@/lib/ai/verifyWithOpenAI';

// Keep doc-mode clinical prelude tight & relevant (data only)
function filterComputedForDocMode(items: any[], latestUser: string) {
  const msg = (latestUser || '').toLowerCase();
  const mentions = (s: string) => msg.includes(s);
  const isRespContext =
    mentions('cough') || mentions('fever') || mentions('cold') ||
    mentions('breath') || mentions('sore throat');
  const needsPEContext =
    mentions('chest pain') || mentions('pleur') ||
    mentions('shortness of breath') || /\bsob\b/.test(msg);

  return items
    .filter((r: any) => r && (Number.isFinite(r.value) || typeof r.value === 'string'))
    .filter((r: any) => {
      const noteStr = (r.notes || []).join(' ').toLowerCase();
      const lbl = String(r.label || '').toLowerCase();
      return !/surrogate|placeholder|phase-1|inputs? needed|partial/.test(noteStr + ' ' + lbl);
    })
    .filter((r: any) => {
      const lbl = String(r.label || '').toLowerCase();
      if (isRespContext && (/(curb-?65|news2|qsofa|sirs|qcsi|sofa)/i.test(lbl))) return true;
      if (/(perc)/i.test(lbl)) return needsPEContext;
      if (/(glasgow-blatchford|ottawa|ankle|knee|head|rockall|apgar|bishop|pasi|burn|maddrey|fib-4|apri|child-?pugh|meld)/i.test(lbl)) return false;
      return /(curb-?65|news2|qsofa|sirs)/i.test(lbl);
    });
}

export const runtime = 'edge';

const recentReqs = new Map<string, number>();       // dedupe clientRequestId
const verdictCache = new Map<string, { v: any, exp: number }>(); // 10-min cache

// Utility: set CORS headers on responses
function withCORS(res: Response) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function cacheGet(key: string) {
  const hit = verdictCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) { verdictCache.delete(key); return undefined; }
  return hit.v;
}
function cacheSet(key: string, v: any, ttlMs: number) {
  verdictCache.set(key, { v, exp: Date.now() + ttlMs });
}

// --- shared handler (used by GET and POST) ---
async function handleChat(req: NextRequest, payload: any) {
  const { messages = [], context, clientRequestId, mode } = payload || {};
  const showClinicalPrelude = (mode === 'doctor' || mode === 'research' || /trial|research/i.test(String(mode || '')));

  // dedupe frequent client requests
  const now = Date.now();
  for (const [id, ts] of recentReqs.entries()) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) return withCORS(new Response(null, { status: 409 }));
    recentReqs.set(clientRequestId, now);
  }

  // Groq runtime (compiles final answer)
  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url   = `${base.replace(/\/$/,'')}/chat/completions`;

  // strip incoming system messages; we control system prompts
  let finalMessages = (messages || []).filter((m: any) => m.role !== 'system');

  // ===== Multi-turn extraction (use full conversation) =====
  const userText = (messages || [])
    .filter((m: any) => m.role === 'user')
    .map((m: any) => m?.content || '')
    .join('\n');
  const latestUserMessage =
    (messages || []).filter((m: any) => m.role === 'user').slice(-1)[0]?.content || '';

  const rawCtx = extractAll(userText);
  const ctx = normalizeCtx(rawCtx);
  const computed = computeAll(ctx);

  // Crisis heuristics (+ glucose alias fix)
  const glucose = Number(ctx.glucose ?? ctx.glucose_mg_dl);
  const hco3    = Number(ctx.HCO3 ?? ctx.bicarb ?? ctx.bicarbonate);
  const ph      = Number(ctx.pH);
  const k       = Number(ctx.K ?? ctx.potassium);
  const hyperglycemicCrisis =
    (Number.isFinite(glucose) && glucose >= 250) &&
    ((Number.isFinite(hco3) && hco3 <= 18) || (Number.isFinite(ph) && ph < 7.30));
  const hyperkalemiaDanger  = Number.isFinite(k) && k >= 6.0;

  const mustShow = new Set<string>([
    'measured_osm_status','osmolar_gap','serum_osm_calc','anion_gap_albumin_corrected',
    'hyponatremia_tonicity','hyperkalemia_severity','potassium_status','dka_severity','hhs_flags',
  ]);
  const promoted = computed.filter(r => r && mustShow.has(r.id));
  const crisisPromoted = (hyperglycemicCrisis || hyperkalemiaDanger) ? promoted : [];

  // --- JOINT DECISION PROTOCOL (OpenAI GPT-5 verifies/corrects; Groq compiles) ---
  const JOINT_DECISION_RULES = [
    'JOINT DECISION PROTOCOL:',
    '- You (OpenAI GPT-5) and the Calculators work TOGETHER.',
    '- Treat calculator outputs as a first pass; correct edge/missing-input errors.',
    "- Cross-check physiology: Winter’s, osmolality 275–295 normal, albumin-corrected anion gap, potassium bands, renal flags.",
    '- If conflict exists, use your corrected values.',
    '- Be decisive; calculators are data, not directives.',
    '- Do not output any verification badge or correction line to the user.'
  ].join('\n');

  // Always include JOINT rules first
  finalMessages = [{ role: 'system', content: JOINT_DECISION_RULES }, ...finalMessages];

  // ===== GPT-5 verification (10s timeout; 10-min cache) =====
  const ctxHash = await sha256Hex(JSON.stringify({ ctx, calculatorsVersion: 'v1' }));
  const cacheKey = `v1:${ctxHash}`;
  let verdict = cacheGet(cacheKey);
  if (!verdict && (showClinicalPrelude || computed.length > 0)) {
    verdict = await verifyWithOpenAI({ mode: String(mode || 'default'), ctx, computed, timeoutMs: 10_000 }) || null;
    if (verdict) cacheSet(cacheKey, verdict, 10 * 60 * 1000);
  }

  // Overlay corrections (if any) — GPT-5 has final say
  let blended = computed;
  if (verdict?.corrected_values && typeof verdict.corrected_values === 'object') {
    const byId = new Map(blended.map(r => [r?.id, r]));
    for (const [k, v] of Object.entries(verdict.corrected_values)) {
      const target = byId.get(k);
      if (target) {
        if (v && typeof v === 'object' && 'value' in (v as any)) {
          Object.assign(target, v); // {value, unit, notes[]}
        } else {
          (target as any).value = v;
        }
        if ((v as any)?.notes && Array.isArray((v as any).notes)) {
          (target as any).notes = Array.from(new Set([...(target as any).notes || [], ...(v as any).notes]));
        }
      } else {
        byId.set(k, { id: k, label: k, value: (v as any)?.value ?? v, unit: (v as any)?.unit, notes: (v as any)?.notes ?? [] });
      }
    }
    blended = Array.from(byId.values());
  }

  // Doctor/Research: provide data-only prelude (promoted + filtered); no directive text
  if (showClinicalPrelude) {
    const filtered = filterComputedForDocMode(blended, latestUserMessage ?? '');
    const linesSet = new Map([...crisisPromoted, ...filtered].map(r => [r.id, r]));
    const lines = Array.from(linesSet.values()).map(r => {
      const val = r.unit ? `${r.value} ${r.unit}` : String(r.value);
      const notes = r.notes?.length ? ` — ${r.notes.join('; ')}` : '';
      return `${r.label}: ${val}${notes}`;
    });
    if (lines.length) finalMessages = [{ role: 'system', content: lines.join('\n') }, ...finalMessages];
  }

  // Profile context
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

  // === Groq compile & stream ===
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
      messages: finalMessages
    })
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return withCORS(new Response(`LLM error: ${err}`, { status: 500 }));
  }

  const streamRes = new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    }
  });
  return withCORS(streamRes);
}

// ===== Exported HTTP methods =====

// POST: JSON body
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  return handleChat(req, payload);
}

// GET: support EventSource (?payload=<urlencoded JSON>) to avoid 405
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const raw = url.searchParams.get('payload');
  let payload: any = {};
  if (raw) {
    try { payload = JSON.parse(decodeURIComponent(raw)); } catch { payload = {}; }
  } else {
    const mode = url.searchParams.get('mode') || undefined;
    const context = url.searchParams.get('context') || undefined;
    const msgs = url.searchParams.get('messages');
    let messages: any[] | undefined = undefined;
    if (msgs) { try { messages = JSON.parse(msgs); } catch {} }
    payload = { mode, context, messages };
  }
  return handleChat(req, payload);
}

// OPTIONS: preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// HEAD: some clients/proxies probe with HEAD; return 200
export async function HEAD() {
  return withCORS(new Response(null, { status: 200 }));
}
