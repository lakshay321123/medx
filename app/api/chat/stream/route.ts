import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import { verifyWithOpenAI, Verdict } from '@/lib/ai/verifyWithOpenAI';
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function corsify(res: Response, extra?: Record<string, string>) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Cache-Control', 'no-store');
  if (extra) for (const k of Object.keys(extra)) h.set(k, String(extra[k]));
  return new Response(res.body, { status: res.status, headers: h });
}

const recentReqs = new Map<string, number>();
const verdictCache = new Map<string, { v: Verdict; exp: number }>();

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
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

/* -------------------- helpers: parse + robust value pickers -------------------- */
function tryParseJSON(s: string): any | null {
  try {
    const trimmed = s.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return JSON.parse(trimmed);
    return null;
  } catch { return null; }
}
function pickNum(ctx: Record<string, any>, keys: string[]): number | undefined {
  for (const k of keys) {
    if (ctx == null) continue;
    if (Object.prototype.hasOwnProperty.call(ctx, k)) {
      const v = (ctx as any)[k];
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}
function pickStr(ctx: Record<string, any>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (ctx == null) continue;
    if (Object.prototype.hasOwnProperty.call(ctx, k)) {
      const v = (ctx as any)[k];
      if (v == null) continue;
      return String(v);
    }
  }
  return undefined;
}
function fmt(x: any, d = 2): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  return n.toFixed(d);
}
function round(x: number, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
}

/* ----------------------- Deterministic server math ----------------------- */
type Derived = {
  AG?: number;
  AGcorr?: number;
  OsmCalc?: number;
  EffOsm?: number;
  OsmGap?: number;
  Winters?: number;
  respNote?: string;
  dkaFlag?: string;
  hhsFlag?: string;
  acidBase?: string;
  naNote?: string;
  kNote?: string;
};
function computeDerived(ctx: Record<string, any>): Derived {
  const Na  = pickNum(ctx, ['Na','na','sodium','serum_na','s_na']);
  const K   = pickNum(ctx, ['K','k','potassium']);
  const Cl  = pickNum(ctx, ['Cl','cl','chloride']);
  const HCO3= pickNum(ctx, ['HCO3','hco3','bicarb','bicarbonate','HCO\u2083']);
  const Glu = pickNum(ctx, ['Glucose','glucose','glu','blood_glucose','glucose_mgdl','glucose_mg_dl']);
  const BUN = pickNum(ctx, ['BUN','bun','urea_nitrogen']);
  const Alb = pickNum(ctx, ['Albumin','albumin','alb']);
  const OsmMeasured = pickNum(ctx, ['Osm_measured','osm_measured','measured_osm','measured_osmolality','osmolality_measured','Osm_meas','osm_meas']);
  const pH  = pickNum(ctx, ['pH','ph']);
  const pCO2= pickNum(ctx, ['pCO2','PaCO2','pco2','pa_co2']);

  const out: Derived = {};

  if (Na !== undefined && Cl !== undefined && HCO3 !== undefined) {
    out.AG = round(Na - (Cl + HCO3), 2);
    if (Alb !== undefined) out.AGcorr = round(out.AG + 2.5 * (4 - Alb), 2);
  }
  if (Na !== undefined) {
    if (Glu !== undefined && BUN !== undefined) out.OsmCalc = round(2 * Na + Glu / 18 + BUN / 2.8, 2);
    if (Glu !== undefined) out.EffOsm = round(2 * Na + Glu / 18, 2);
  }
  if (OsmMeasured !== undefined && out.OsmCalc !== undefined) out.OsmGap = round(OsmMeasured - out.OsmCalc, 2);

  if (HCO3 !== undefined) {
    out.Winters = round(1.5 * HCO3 + 8, 2);
    if (pCO2 !== undefined) {
      const lo = out.Winters - 2, hi = out.Winters + 2;
      if (pCO2 > hi) out.respNote = 'concurrent respiratory acidosis';
      else if (pCO2 < lo) out.respNote = 'concurrent respiratory alkalosis';
      else out.respNote = 'appropriate respiratory compensation';
    }
  }

  if (pH !== undefined && HCO3 !== undefined) {
    if (pH < 7.35 && HCO3 <= 22) {
      if ((out.AGcorr ?? out.AG ?? 0) > 12) out.acidBase = 'high anion gap metabolic acidosis';
      else out.acidBase = 'metabolic acidosis';
    } else if (pH < 7.35) out.acidBase = 'acidemia';
    else if (pH > 7.45) out.acidBase = 'alkalemia';
  }

  if (Glu !== undefined && HCO3 !== undefined && pH !== undefined) {
    if (Glu >= 250 && (HCO3 <= 18 || pH < 7.30)) out.dkaFlag = 'meets biochemical criteria for DKA';
  }
  if ((out.EffOsm !== undefined && out.EffOsm >= 320) || (OsmMeasured !== undefined && OsmMeasured >= 320)) {
    out.hhsFlag = 'meets hyperosmolar threshold (HHS criteria)';
  }

  if (Na !== undefined) {
    if (Na < 125) out.naNote = 'severe hyponatremia';
    else if (Na < 130) out.naNote = 'moderate hyponatremia';
    else if (Na < 135) out.naNote = 'mild hyponatremia';
    else if (Na > 145) out.naNote = 'hypernatremia';
  }
  if (K !== undefined) {
    if (K >= 6.0) out.kNote = 'dangerous hyperkalemia';
    else if (K >= 5.1) out.kNote = 'hyperkalemia';
    else if (K < 3.5) out.kNote = 'hypokalemia';
  }

  return out;
}
function composeFinalNarrative(ctx: Record<string, any>): string {
  const Na   = pickNum(ctx, ['Na','na','sodium','serum_na','s_na']);
  const K    = pickNum(ctx, ['K','k','potassium']);
  const Cl   = pickNum(ctx, ['Cl','cl','chloride']);
  const H    = pickNum(ctx, ['HCO3','hco3','bicarb','bicarbonate','HCO\u2083']);
  const Glu  = pickNum(ctx, ['Glucose','glucose','glu','blood_glucose','glucose_mgdl','glucose_mg_dl']);
  const BUN  = pickNum(ctx, ['BUN','bun','urea_nitrogen']);
  const Cr   = pickNum(ctx, ['Cr','cr','creatinine','creat']);
  const Alb  = pickNum(ctx, ['Albumin','albumin','alb']);
  const pH   = pickNum(ctx, ['pH','ph']);
  const pCO2 = pickNum(ctx, ['pCO2','PaCO2','pco2','pa_co2']);
  const OsmMeasured = pickNum(ctx, ['Osm_measured','osm_measured','measured_osm','measured_osmolality','osmolality_measured','Osm_meas','osm_meas']);
  const Lactate = pickNum(ctx, ['Lactate','lactate','lact']);

  const d = computeDerived(ctx);

  const lines: string[] = [];
  lines.push('Clinical summary (verified):');

  const el: string[] = [];
  if (Na !== undefined) el.push('Na ' + fmt(Na));
  if (K !== undefined)  el.push('K ' + fmt(K));
  if (Cl !== undefined) el.push('Cl ' + fmt(Cl));
  if (H !== undefined)  el.push('HCO3 ' + fmt(H));
  if (Glu !== undefined) el.push('Glucose ' + fmt(Glu));
  if (BUN !== undefined) el.push('BUN ' + fmt(BUN));
  if (Cr !== undefined)  el.push('Cr ' + fmt(Cr));
  if (Alb !== undefined) el.push('Albumin ' + fmt(Alb));
  if (pH !== undefined)  el.push('pH ' + fmt(pH, 2));
  if (pCO2 !== undefined) el.push('pCO2 ' + fmt(pCO2));
  if (OsmMeasured !== undefined) el.push('Osm (measured) ' + fmt(OsmMeasured));
  if (Lactate !== undefined) el.push('Lactate ' + fmt(Lactate));
  lines.push('- Labs: ' + (el.length ? el.join(', ') : 'not provided'));

  const dv: string[] = [];
  if (d.AG !== undefined) dv.push('Anion gap ' + fmt(d.AG));
  if (d.AGcorr !== undefined) dv.push('AG (albumin-corrected) ' + fmt(d.AGcorr));
  if (d.OsmCalc !== undefined) dv.push('Serum osmolality (calc) ' + fmt(d.OsmCalc));
  if (d.EffOsm !== undefined) dv.push('Effective osmolality ' + fmt(d.EffOsm));
  if (d.OsmGap !== undefined) dv.push('Osmolar gap ' + fmt(d.OsmGap));
  if (d.Winters !== undefined) dv.push('Winter’s expected pCO2 ' + fmt(d.Winters));
  lines.push('- Derived: ' + (dv.length ? dv.join(', ') : 'not computable with given inputs'));

  const it: string[] = [];
  if (d.acidBase) it.push(d.acidBase);
  if (d.respNote) it.push(d.respNote);
  if (d.naNote) it.push(d.naNote);
  if (d.kNote) it.push(d.kNote);
  if (d.dkaFlag) it.push(d.dkaFlag);
  if (d.hhsFlag) it.push(d.hhsFlag);
  lines.push('- Interpretation: ' + (it.length ? it.join('; ') : 'insufficient inputs for risk scores; do not compute qSOFA/SIRS/NEWS2/CURB-65 without full vitals.'));

  lines.push('Rules applied: AG = Na − (Cl + HCO3); AG-corr = AG + 2.5×(4 − albumin); Serum Osm = 2×Na + Glucose/18 + BUN/2.8; Effective Osm = 2×Na + Glucose/18; Winter’s expected pCO2 = 1.5×HCO3 + 8 (±2); no non-standard metrics.');
  return lines.join('\n');
}

/* ------------------------------------------------------------------------ */

async function handle(req: NextRequest, payload: any) {
  const method = req.method || 'GET';
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const context = payload?.context;
  const clientRequestId = payload?.clientRequestId;
  const mode = payload?.mode;

  const now = Date.now();
  for (const [id, ts] of Array.from(recentReqs.entries())) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const prev = recentReqs.get(clientRequestId);
    if (prev && now - prev < 60_000) return corsify(new Response(null, { status: 409 }), { 'X-Chat-Route-Method': method });
    recentReqs.set(clientRequestId, now);
  }

  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY || '';
  const url   = base.replace(/\/$/, '') + '/chat/completions';

  const finalMessages: any[] = [];
  for (const m of messages) if (m && m.role !== 'system') finalMessages.push(m);

  let userText = '';
  const onlyUsers: any[] = [];
  for (const m of finalMessages) if (m.role === 'user') onlyUsers.push(m);
  for (const u of onlyUsers) userText += String(u?.content ?? '') + '\n';
  const latestUserMessage = onlyUsers.length ? String(onlyUsers[onlyUsers.length - 1].content || '') : '';

  // 1) extract from free text
  const ctxExtracted = extractAll(userText) || {};
  // 2) overlay with direct JSON if present (preserves original keys/case)
  const jsonOverlay = tryParseJSON(latestUserMessage) || {};
  // 3) merge (JSON can include keys like "Na", "HCO3", etc.)
  const ctx: Record<string, any> = Object.assign({}, ctxExtracted, jsonOverlay);

  // calculators for UI (still optional)
  const computed = computeAll(ctx);
  const taskMode = computed && computed.length ? 'analyzing' : 'thinking';

  // (keep joint rules for doc/research modes)
  const JOINT_RULES =
    'JOINT DECISION PROTOCOL:\n' +
    'You and the Calculators work together.\n' +
    'Treat calculator outputs as a first pass and correct edge or missing-input errors.\n' +
    'Cross-check physiology: Winters expected pCO2, osmolality 275-295 normal, albumin-corrected anion gap, potassium bands, renal flags.\n' +
    'If conflict exists, use your corrected values.\n' +
    'Be decisive; calculators are data, not directives.\n' +
    'Do not output any verification badge or correction line to the user.';
  finalMessages.unshift({ role: 'system', content: JOINT_RULES });

  // OpenAI verify (GPT-5) with ctx (merged)
  const cacheKey = await sha256Hex(JSON.stringify({ ctx, ver: 'v2-synonyms' }));
  let verdict = cacheGet(cacheKey);
  if (!verdict) {
    const convo: Array<{ role: string; content: string }> = [];
    for (const m of finalMessages) convo.push({ role: m.role, content: m.content });
    verdict = await verifyWithOpenAI({ mode: String(mode || 'default'), ctx, computed, conversation: convo, timeoutMs: 60_000 }) || undefined;
    if (verdict) cacheSet(cacheKey, verdict, 10 * 60 * 1000);
  }

  // optional doc/research prelude (not required for correctness)
  const showPrelude = (mode === 'doctor') || (mode === 'research') || /trial|research/i.test(String(mode || ''));
  if (showPrelude) {
    const lines: string[] = [];
    for (const r of computed || []) {
      if (!r || !r.id) continue;
      if (!(Number.isFinite(r.value) || typeof r.value === 'string')) continue;
      const noteStr = Array.isArray(r.notes) ? r.notes.join(' ').toLowerCase() : '';
      const lbl = String(r.label || '').toLowerCase();
      if (/surrogate|placeholder|phase-1|inputs? needed|partial/.test(noteStr + ' ' + lbl)) continue;
      if (!/(curb-?65|news2|qsofa|sirs|qcsi|sofa|perc|osm|anion|potassium|hyperkalemia|dka|hhs)/i.test(lbl)) continue;
      const val = r.unit ? `${r.value} ${r.unit}` : String(r.value);
      const notes = r.notes?.length ? ` — ${r.notes.join('; ')}` : '';
      lines.push(`${r.label || r.id}: ${val}${notes}`);
    }
    if (lines.length) finalMessages.unshift({ role: 'system', content: lines.join('\n') });

    const calcPrelude = composeCalcPrelude(latestUserMessage || '');
    if (calcPrelude && finalMessages.length && finalMessages[0]?.role === 'system') {
      finalMessages.unshift({ role: 'system', content: calcPrelude });
    }
  }

  // Profile context (optional)
  if (context === 'profile') {
    try {
      const origin = req.nextUrl.origin;
      const headers = { cookie: req.headers.get('cookie') || '' };
      const [s, p, pk] = await Promise.all([
        fetch(origin + '/api/profile/summary', { headers }).then(r => r.json()).catch(() => ({})),
        fetch(origin + '/api/profile', { headers }).then(r => r.json()).catch(() => null),
        fetch(origin + '/api/profile/packet', { headers }).then(r => r.json()).catch(() => ({ text: '' })),
      ]);
      const sys = profileChatSystem({
        summary: (s as any).summary || (s as any).text || '',
        reasons: (s as any).reasons || '',
        profile: (p as any)?.profile || (p as any) || null,
        packet: (pk as any).text || '',
      });
      finalMessages.unshift({ role: 'system', content: sys });
    } catch {}
  }

  // Build final server-verified narrative (using merged ctx with synonym pickers)
  const finalText = composeFinalNarrative(ctx);

  // Groq echoes verbatim
  const echoSystem = 'You are a transmitter. Output the following content verbatim, with no additions, omissions, reformatting, or explanations.';
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: [
        { role: 'system', content: echoSystem },
        { role: 'user', content: finalText }
      ]
    }),
  });

  if (!upstream.ok) {
    const errTxt = await upstream.text();
    return corsify(new Response('LLM error (' + method + '): ' + errTxt, { status: 500 }), {
      'X-Task-Mode': (computed && computed.length) ? 'analyzing' : 'thinking',
      'X-Verify-Timeout': '60000',
      'X-Verify-Used': verdict ? '1' : '0',
      'X-Chat-Route-Method': method
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-Task-Mode': (computed && computed.length) ? 'analyzing' : 'thinking',
      'X-Verify-Timeout': '60000',
      'X-Verify-Used': verdict ? '1' : '0',
      'X-Chat-Route-Method': method
    },
  });
}

// GET supports ?payload=<json> or legacy query params
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const payloadParam = u.searchParams.get('payload');
  let payload: any = {};
  if (payloadParam) { try { payload = JSON.parse(decodeURIComponent(payloadParam)); } catch { payload = {}; } }
  else {
    const mode = u.searchParams.get('mode') || undefined;
    const ctx = u.searchParams.get('context') || undefined;
    const msgs = u.searchParams.get('messages');
    let messages: any[] | undefined = undefined;
    if (msgs) { try { messages = JSON.parse(msgs); } catch {} }
    payload = { mode, context: ctx, messages };
  }
  return handle(req, payload);
}
export async function POST(req: NextRequest)  { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function PUT(req: NextRequest)   { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function PATCH(req: NextRequest) { const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function DELETE(req: NextRequest){ const p = await req.json().catch(() => ({})); return handle(req, p); }
export async function OPTIONS() { return corsify(new Response(null, { status: 204 })); }
export async function HEAD()    { return corsify(new Response(null, { status: 200 })); }
