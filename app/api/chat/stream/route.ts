import { NextRequest, NextResponse } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll, normalizeCtx } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ——— Utilities ———
function corsify(res: Response, statusOverride?: number) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Cache-Control', 'no-store');
  return new Response(res.body, { status: statusOverride ?? res.status, headers: h });
}

const recentReqs = new Map<string, number>(); // dedupe clientRequestId

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

// ——— Core handler (used by all methods) ———
async function handleChat(req: NextRequest, payload: any) {
  const { messages = [], context, clientRequestId, mode } = payload || {};
  const method = req.method || 'GET';

  // Dedupe frequent client requests
  const now = Date.now();
  for (const [id, ts] of recentReqs.entries()) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) {
      return corsify(new Response(null, { status: 409 }));
    }
    recentReqs.set(clientRequestId, now);
  }

  const showClinicalPrelude =
    (mode === 'doctor') || (mode === 'research') || /trial|research/i.test(String(mode || ''));

  // Groq as runtime LLM (compiles final answer)
  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url   = `${base.replace(/\/$/,'')}/chat/completions`;

  // Sanitize incoming messages
  let finalMessages = (messages || []).filter((m: any) => m.role !== 'system');

  // ===== Multi-turn extraction (use the whole conversation) =====
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

  // JOINT DECISION PROTOCOL (GPT-5 verifies; Groq compiles)
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

  // Doctor/Research: provide data-only prelude (promoted + filtered)
  if (showClinicalPrelude) {
    const filtered = filterComputedForDocMode(computed, latestUserMessage ?? '');
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

  // Call Groq and stream back
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
    const res = new Response(`LLM error (${method}): ${err}`, { status: 500 });
    return corsify(res);
  }

  const res = new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-Chat-Route-Method': method,
    },
  });
  return res;
}

// ——— Export handlers for all common methods ———
async function readPayloadFromGET(req: NextRequest) {
  const url = req.nextUrl;
  const raw = url.searchParams.get('payload');
  if (raw) {
    try { return JSON.parse(decodeURIComponent(raw)); } catch { return {}; }
  }
  // Fallback legacy query params
  const mode = url.searchParams.get('mode') || undefined;
  const context = url.searchParams.get('context') || undefined;
  const msgs = url.searchParams.get('messages');
  let messages: any[] | undefined;
  if (msgs) { try { messages = JSON.parse(msgs); } catch { /* ignore */ } }
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

export async function PUT(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  return handleChat(req, payload);
}

export async function PATCH(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  return handleChat(req, payload);
}

export async function DELETE(req: NextRequest) {
  // Accept but treat like a read-only stream; body optional
  const payload = await req.json().catch(() => ({}));
  return handleChat(req, payload);
}

export async function OPTIONS() {
  return corsify(new Response(null, { status: 204 }));
}

export async function HEAD() {
  return corsify(new Response(null, { status: 200 }));
}
