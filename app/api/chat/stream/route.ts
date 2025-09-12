import { NextRequest, NextResponse } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll, normalizeCtx } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import { verifyWithOpenAI, Verdict } from '@/lib/ai/verifyWithOpenAI';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------- Utils ----------
function corsify(res: Response, extra?: Record<string, string>) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Cache-Control', 'no-store');
  if (extra) for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

const recentReqs = new Map<string, number>(); // dedupe
const verdictCache = new Map<string, { v: Verdict, exp: number }>(); // 10-min cache

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
function cacheSet(key: string, v: Verdict, ttlMs: number) {
  verdictCache.set(key, { v, exp: Date.now() + ttlMs });
}

// Doc-mode prelude filter (data only)
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

// ---------- Core handler ----------
async function handleChat(req: NextRequest, payload: any) {
  const { messages = [], context, clientRequestId, mode } = payload || {};
  const method = req.method || 'GET';

  // Deduplication
  const now = Date.now();
  for (const [id, ts] of recentReqs.entries()) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) return corsify(new Response(null, { status: 409 }));
    recentReqs.set(clientRequestId, now);
  }

  // Groq (composer)
  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url   = `${base.replace(/\/$/,'')}/chat/completions`;

  // Strip incoming system messages
  let finalMessages = (messages || []).filter((m: any) => m.role !== 'system');

  // Multi-turn extraction
  const userText = (messages || [])
    .filter((m: any) => m.role === 'user')
    .map((m: any) => m?.content || '')
    .join('\n');

  const latestUserMessage =
    (messages || []).filter((m: any) => m.role === 'user').slice(-1)[0]?.content || '';

  const rawCtx = extractAll(userText);
  const ctx = normalizeCtx(rawCtx);
  const computed = computeAll(ctx);

  // Task mode hint for UI timers
  const taskMode = (computed && computed.length > 0) ? 'analyzing' : 'thinking';

  // JOINT protocol (Groq sees this; GPT-5 is authority)
  const JOINT_DECISION_RULES = [
    'JOINT DECISION PROTOCOL:',
    '- You (OpenAI GPT-5) and the Calculators work TOGETHER.',
    '- Treat calculator outputs as a first pass; correct edge/missing-input errors.',
    "- Cross-check physiology: Winter’s (expected pCO2), osmolality 275–295 normal, albumin-corrected anion gap, potassium bands, renal flags.",
    '- If conflict exists, use your corrected values.',
    '- Be decisive; calculators are data, not directives.',
    '- Do not output any verification badge or correction line to the user.'
  ].join('\n');

  finalMessages = [{ role: 'system', content: JOINT_DECISION_RULES }, ...finalMessages];

  // GPT-5 verification — ALWAYS (1 min timeout; 10-min cache)
  const cacheKey = await sha256Hex(JSON.stringify({ ctx, calculatorsVersion: 'v1' }));
  let verdict = cacheGet(cacheKey) as Verdict | undefined;
  if (!verdict) {
    verdict = await verifyWithOpenAI({
      mode: String(mode || 'default'),
      ctx,
      computed,
      conversation: (messages || []).map((m: any) => ({ role: m.role, content: m.content })),
      timeoutMs: 60_000
    }) || undefined;
    if (verdict) cacheSet(cacheKey, verdict, 10 * 60 * 1000);
  }

  // Overlay corrections (GPT-5 wins)
  let blended = computed;
  if (verdict?.corrected_values && typeof verdict.corrected_values === 'object') {
    const byId = new Map(blended.map((r: any) => [r?.id, r]));
    for (const [k, v] of Object.entries(verdict.corrected_values)) {
      const t = byId.get(k);
      if (t) {
        if (v && typeof v === 'object' && 'value' in (v as any)) {
          Object.assign(t, v);
        } else {
          (t as any).value = v;
        }
        if ((v as any)?.notes && Array.isArray((v as any).notes)) {
          (t as any).notes = Array.from(new Set([...(t as any).notes || [], ...(v as any).notes]));
        }
      } else {
        byId.set(k, { id: k, label: k, value: (v as any)?.value ?? v, unit: (v as any)?.unit, notes: (v as any)?.notes ?? [] });
      }
    }
    blended = Array.from(byId.values());
  }

  // Crisis heuristics on corrected data (glucose alias fix)
  const num = (x: any) => (typeof x === 'number' ? x : Number(x));
  const g = num((ctx as any).glucose ?? (ctx as any).glucose_mg_dl);
  const bicarb = num((ctx as any).HCO3 ?? (ctx as any).bicarb ?? (ctx as any).bicarbonate);
  const ph = num((ctx as any).pH);
  const kVal = num((ctx as any).K ?? (ctx as any).potassium);
  const hyperglycemicCrisis =
    (Number.isFinite(g) && g >= 250) &&
    ((Number.isFinite(bicarb) && bicarb <= 18) || (Number.isFinite(ph) && ph < 7.30));
  const hyperkalemiaDanger  = Number.isFinite(kVal) && kVal >= 6.0;

  const mustShow = new Set<string>([
    'measured_osm_status','osmolar_gap','serum_osm_calc','anion_gap_albumin_corrected',
    'hyponatremia_tonicity','hyperkalemia_severity','potassium_status','dka_severity','hhs_flags',
  ]);
  const promoted = blended.filter((r: any) => r && mustShow.has(r.id));
  const crisisPromoted = (hyperglycemicCrisis || hyperkalemiaDanger) ? promoted : [];

  // Doctor/Research: data-only prelude from corrected values
  const showClinicalPrelude =
    (mode === 'doctor') || (mode === 'research') || /trial|research/i.test(String(mode || ''));
  if (showClinicalPrelude) {
    const filtered = filterComputedForDocMode(blended, latestUserMessage ?? '');
    const linesSet = new Map([...crisisPromoted, ...filtered].map((r: any) => [r.id, r]));
    const lines = Array.from(linesSet.values()).map((r: any) => {
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

  // Groq compose & stream
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
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
    return corsify(new Response(`LLM error (${method}): ${err}`, { status: 500 }), {
      'X-Task-Mode': taskMode,
      'X-Verify-Timeout': '60000',
      'X-Verify-Used': verdict ? '1' : '0',
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-Task-Mode': taskMode,
      'X-Verify-Timeout': '60000',
      'X-Verify-Used': verdict ? '1' : '0',
    },
  });
}

// ---------- HTTP methods ----------
async function readPayloadFromGET(req: NextRequest) {
  const url = req.nextUrl;
  const raw = url.searchParams.get('payload');
  if (raw) { try { return JSON.parse(decodeURIComponent(raw)); } catch { return {}; } }
  const mode = url.searchParams.get('mode') || undefined;
  const context = url.searchParams.get('context') || undefined;
  const msgs = url.searchParams.get('messages');
  let messages: any[] | undefined;
  if (msgs) { try { messages = JSON.parse(msgs); } catch {} }
  return { mode, context, messages };
}

export async function GET(req: NextRequest) {
  const payload = await readPayloadFromGET(req);
  return handleChat(req, payload);
}
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  return handleChat(req, payload);
}
export async function OPTIONS() { return corsify(new Response(null, { status: 204 })); }
export async function HEAD()    { return corsify(new Response(null, { status: 200 })); }
