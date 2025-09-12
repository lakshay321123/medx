import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
// === [MEDX_CALC_ROUTE_IMPORTS_START] ===
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';
// === [MEDX_CALC_ROUTE_IMPORTS_END] ===

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

function corsify(res: Response, extra?: Record<string,string>) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  if (extra) { for (const [k,v] of Object.entries(extra)) h.set(k,v); }
  return new Response(res.body, { status: res.status, headers: h });
}

async function handle(req: NextRequest, payload: any) {
  const { messages = [], context, clientRequestId, mode } = payload || {};

  // light dedupe by clientRequestId
  const now = Date.now();
  for (const [id, ts] of recentReqs.entries()) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) {
      return corsify(new Response(null, { status: 409 }));
    }
    recentReqs.set(clientRequestId, now);
  }

  const base  = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url = `${base.replace(/\/$/,'')}/chat/completions`;

  let finalMessages = (messages || []).filter((m: any) => m.role !== 'system');

  const latestUserMessage = (messages || []).filter((m: any) => m.role === 'user').slice(-1)[0]?.content || '';
  const userText = (messages || []).filter((m: any) => m.role === 'user').map((m:any)=>m?.content||'').join('\n');
  const ctx = extractAll(userText);
  const computed = computeAll(ctx);

  // Crisis promotion heuristics
  function byId(id: string) { return computed.find(r => r?.id === id); }
  const glucose = Number((ctx as any).glucose ?? (ctx as any).glucose_mgdl);
  const hco3   = Number((ctx as any).HCO3 ?? (ctx as any).bicarb ?? (ctx as any).bicarbonate);
  const ph     = Number((ctx as any).pH);
  const k      = Number((ctx as any).K ?? (ctx as any).potassium);
  const hyperglycemicCrisis = (Number.isFinite(glucose) && glucose >= 250) && ((Number.isFinite(hco3) && hco3 <= 18) || (Number.isFinite(ph) && ph < 7.30));
  const hyperkalemiaDanger  = Number.isFinite(k) && k >= 6.0;
  const mustShow = new Set<string>([
    'measured_osm_status','osmolar_gap','serum_osm_calc','anion_gap_albumin_corrected',
    'hyponatremia_tonicity','hyperkalemia_severity','potassium_status','dka_severity','hhs_flags'
  ]);
  const promoted = computed.filter(r => r && mustShow.has(r.id));
  const crisisPromoted = (hyperglycemicCrisis || hyperkalemiaDanger) ? promoted : [];

  const showClinicalPrelude = (mode === 'doctor' || mode === 'research');
  if (showClinicalPrelude) {
    const filtered = filterComputedForDocMode(computed, latestUserMessage ?? '');
    const blended  = [...new Map([...crisisPromoted, ...filtered].map(r => [r.id, r])).values()];
    if (blended.length) {
      const lines = blended.map((r:any) => {
        const val = r.unit ? `${r.value} ${r.unit}` : String(r.value);
        const notes = r.notes?.length ? ` — ${r.notes.join('; ')}` : '';
        return `${r.label}: ${val}${notes}`;
      });
      finalMessages = [
        {
          role: 'system',
          content:
            'Use these pre-computed clinical values only if relevant to the question. Do not re-calculate. If inputs are missing, state which values are required and avoid quoting incomplete scores.'
        },
        { role: 'system', content: lines.join('\n') },
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
        summary: (s as any).summary || (s as any).text || '',
        reasons: (s as any).reasons || '',
        profile: (p as any)?.profile || (p as any) || null,
        packet: (pk as any).text || '',
      });
      finalMessages = [{ role: 'system', content: sys }, ...finalMessages];
    } catch {}
  }

  // Optional calc prelude string, only if we actually included computed lines
  const __calcPrelude = composeCalcPrelude(latestUserMessage ?? '');
  if (showClinicalPrelude && __calcPrelude && finalMessages.length && finalMessages[0]?.role === 'system') {
    finalMessages = [{ role: 'system', content: __calcPrelude }, ...finalMessages];
  }

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
    return corsify(new Response(`LLM error: ${err}`, { status: 500 }));
  }

  return corsify(new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
  }));
}

// ---------- HTTP methods ----------

// GET supports ?payload=<json>  OR legacy: ?mode=&context=&messages=[...]
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const payloadParam = u.searchParams.get('payload');
  let payload: any = {};
  if (payloadParam) {
    try { payload = JSON.parse(decodeURIComponent(payloadParam)); }
    catch { payload = {}; }
  } else {
    const mode = u.searchParams.get('mode') || undefined;
    const context = u.searchParams.get('context') || undefined;
    const messagesStr = u.searchParams.get('messages');
    let messages: any[] | undefined;
    if (messagesStr) { try { messages = JSON.parse(messagesStr); } catch {} }
    payload = { mode, context, messages };
  }
  return handle(req, payload);
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  return handle(req, payload);
}

export async function OPTIONS() {
  return corsify(new Response(null, { status: 204 }));
}

export async function HEAD() {
  return corsify(new Response(null, { status: 200 }));
}
