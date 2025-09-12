// app/api/chat/stream/route.ts
import { NextRequest } from 'next/server';
import { extractAll } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import { verifyWithOpenAI } from '@/lib/ai/verifyWithOpenAI';

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

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

// OpenAI-shaped streaming chunks so the UI renders text
function sseFromText(text: string, model = 'gpt-5-verified') {
  const enc = new TextEncoder();
  const ts = Math.floor(Date.now() / 1000);
  const CHUNK = 800;

  const frames: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK) {
    const piece = text.slice(i, i + CHUNK);
    const id = `local-${ts}-${(i / CHUNK) | 0}`;
    frames.push(
      `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: ts, model, choices: [{ index: 0, delta: { content: piece }, finish_reason: null }] })}\n\n`
    );
  }
  const doneId = `local-${ts}-done`;
  frames.push(
    `data: ${JSON.stringify({ id: doneId, object: 'chat.completion.chunk', created: ts, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`
  );
  frames.push(`data: [DONE]\n\n`);

  return new ReadableStream({
    start(controller) { for (const f of frames) controller.enqueue(enc.encode(f)); controller.close(); }
  });
}

// ---- helpers: parse embedded JSON and normalize lab keys ----

function extractEmbeddedJSONObject(text: string): any | null {
  let bestStart = -1, bestEnd = -1;
  const s = String(text || '');
  const stack:number[] = [];
  let inStr: '"' | "'" | null = null;
  for (let i=0;i<s.length;i++){
    const ch = s[i], prev = i>0? s[i-1] : '';
    if (inStr){ if (ch===inStr && prev!=='\\') inStr=null; continue; }
    if (ch=='"'||ch==="'"){ inStr=ch as any; continue; }
    if (ch=='{') stack.push(i);
    else if (ch=='}' && stack.length){ bestStart = stack.pop()!, bestEnd = i; }
  }
  if (bestStart>=0 && bestEnd>bestStart) {
    const candidate = s.slice(bestStart, bestEnd+1).trim();
    try { return JSON.parse(candidate); } catch {}
  }
  return null;
}
const num = (x:any)=> (typeof x==='number' ? x : Number(x));
const hasNum = (x:any)=> Number.isFinite(num(x));

function canonicalizeCtx(anyCtx: Record<string, any>) {
  const c: Record<string, any> = { ...anyCtx };

  // alias mapping -> canonical
  const map: Array<[string, string]> = [
    ['sodium','Na'], ['na','Na'],
    ['potassium','K'], ['k','K'],
    ['chloride','Cl'], ['cl','Cl'],
    ['bicarb','HCO3'], ['bicarbonate','HCO3'], ['hco3','HCO3'],
    ['glucose_mgdl','Glucose'], ['glucose_mg_dl','Glucose'], ['glu','Glucose'], ['glucose','Glucose'],
    ['urea','BUN'],
    ['creatinine','Cr'], ['creat','Cr'], ['cr','Cr'],
    ['alb','Albumin'],
    ['ph','pH'],
    ['paco2','pCO2'], ['pco2','pCO2'],
    ['measured_osm','Osm_measured'], ['measured_osmolality','Osm_measured'], ['osmolality','Osm_measured']
  ];
  for (const [src, dst] of map) {
    if (c[src] !== undefined && c[dst] === undefined) c[dst] = c[src];
  }

  // normalize obvious decimal shift for K (e.g., 580 → 5.80)
  if (hasNum(c.K) && num(c.K) > 25 && num(c.K) < 1200) c.K = +(num(c.K)/100).toFixed(2);

  // coerce numerics
  ['Na','K','Cl','HCO3','Glucose','BUN','Cr','Albumin','pH','pCO2','Osm_measured','Lactate'].forEach(k=>{
    if (c[k] !== undefined) c[k] = num(c[k]);
  });

  return c;
}

function textFromMessages(msgs: Array<{role:string; content:string}>){
  let s=''; for (const m of msgs) if (m.role==='user') s += (m.content||'')+'\n'; return s;
}

// basic local fallback summary if verify fails completely
function localFallback(ctx: Record<string, any>) {
  const Na = num(ctx.Na), Cl = num(ctx.Cl), HCO3 = num(ctx.HCO3), Alb = num(ctx.Albumin);
  const Glu = num(ctx.Glucose), BUN = num(ctx.BUN), Meas = num(ctx.Osm_measured);
  const pH  = num(ctx.pH), pCO2 = num(ctx.pCO2);
  const ag = (hasNum(Na)&&hasNum(Cl)&&hasNum(HCO3)) ? +(Na - (Cl + HCO3)).toFixed(2) : undefined;
  const agc = (ag!==undefined && hasNum(Alb)) ? +(ag + 2.5*(4 - Alb)).toFixed(2) : undefined;
  const osm = (hasNum(Na)&&hasNum(Glu)&&hasNum(BUN)) ? +(2*Na + Glu/18 + BUN/2.8).toFixed(2) : undefined;
  const og  = (osm!==undefined && hasNum(Meas)) ? +(Meas - osm).toFixed(2) : undefined;
  const winters = hasNum(HCO3) ? +(1.5*HCO3 + 8).toFixed(2) : undefined;

  const labs: string[] = [];
  ['Na','K','Cl','HCO3','Glucose','BUN','Cr','Albumin','pH','pCO2','Osm_measured','Lactate'].forEach(k=>{
    if (ctx[k] !== undefined && Number.isFinite(num(ctx[k]))) labs.push(`${k} ${num(ctx[k])}`);
  });
  const derived: string[] = [];
  if (ag!==undefined) derived.push(`AG ${ag}`);
  if (agc!==undefined) derived.push(`AG-corr ${agc}`);
  if (osm!==undefined) derived.push(`Serum osm ${osm}`);
  if (og!==undefined) derived.push(`Osm gap ${og}`);
  if (winters!==undefined) derived.push(`Winter's expected pCO2 ${winters}`);

  return `Clinical summary (verified-fallback):\n- Labs: ${labs.join(', ')}\n- Derived: ${derived.join(', ') || 'insufficient to derive'}\n- Interpretation: computed locally due to verifier unavailability\nRules applied: standard formulas.`;
}

async function handle(req: NextRequest, payload: any) {
  const method = req.method || 'GET';
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const clientRequestId = payload?.clientRequestId;
  const mode = payload?.mode;

  // dedupe 60s
  const now = Date.now();
  for (const [id, ts] of Array.from(recentReqs.entries())) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const prev = recentReqs.get(clientRequestId);
    if (prev && now - prev < 60_000) return corsify(new Response(null, { status: 409 }), { 'X-Chat-Route-Method': method });
    recentReqs.set(clientRequestId, now);
  }

  // collect user text
  const nonSystem: Array<{role:string; content:string}> = [];
  for (const m of messages) if (m && m.role !== 'system') nonSystem.push(m);
  const userText = textFromMessages(nonSystem);

  // merge sources → ctx
  const extracted = extractAll(userText) || {};
  const embedded = extractEmbeddedJSONObject(userText) || {};
  const ctxRaw = { ...embedded, ...extracted };
  const ctx = canonicalizeCtx(ctxRaw);

  // first-pass calculators (hints only)
  const computed = computeAll(ctx) || [];

  // ask OpenAI verifier
  const cacheKey = await sha256Hex(JSON.stringify({ ctx, ver: 'openai-final-v2' }));
  const verdict = await verifyWithOpenAI({
    mode: String(mode || 'default'),
    ctx,
    computed,
    conversation: nonSystem.map(m => ({ role: m.role, content: m.content })),
    timeoutMs: 60_000
  });

  // final text: prefer verifier, else local fallback with actual numbers
  const finalText = (verdict && typeof verdict.final_text === 'string' && verdict.final_text.trim())
    ? verdict.final_text
    : localFallback(ctx);

  const stream = sseFromText(finalText);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-Chat-Route-Method': method,
      'X-Verify-Used': verdict ? '1' : '0'
    },
  });
}

// GET supports ?payload=<json> and legacy shape
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

