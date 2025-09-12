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

// --- OpenAI-shaped SSE so UI renders correctly ---
function sseFromText(text: string, model = 'gpt-5-verified') {
  const enc = new TextEncoder();
  const ts = Math.floor(Date.now() / 1000);
  const CHUNK = 800;
  const frames: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK) {
    const piece = text.slice(i, i + CHUNK);
    frames.push(`data: ${JSON.stringify({
      id:`local-${ts}-${i/CHUNK|0}`,
      object:'chat.completion.chunk',
      created:ts,
      model,
      choices:[{index:0, delta:{content:piece}, finish_reason:null}]
    })}\n\n`);
  }
  frames.push(`data: ${JSON.stringify({
    id:`local-${ts}-done`,
    object:'chat.completion.chunk',
    created:ts,
    model,
    choices:[{index:0, delta:{}, finish_reason:'stop'}]
  })}\n\n`);
  frames.push(`data: [DONE]\n\n`);
  return new ReadableStream({ start(c){ for (const f of frames) c.enqueue(enc.encode(f)); c.close(); } });
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
    if (ch=='"'||ch=="'"){ inStr=ch as any; continue; }
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
  if (hasNum(c.K) && num(c.K) > 25 && num(c.K) < 1200) c.K = +(num(c.K)/100).toFixed(2);
  ['Na','K','Cl','HCO3','Glucose','BUN','Cr','Albumin','pH','pCO2','Osm_measured','Lactate'].forEach(k=>{
    if (c[k] !== undefined) c[k] = num(c[k]);
  });
  return c;
}

function textFromMessages(msgs: Array<{role:string; content:string}>){
  let s=''; for (const m of msgs) if (m.role==='user') s += (m.content||'')+'\n'; return s;
}

function preferEmbedded(extracted: Record<string, any>, embedded: Record<string, any>) {
  const out: Record<string, any> = { ...extracted };
  for (const k of Object.keys(embedded || {})) {
    const v = (embedded as any)[k];
    if (v !== null && v !== undefined && (typeof v !== 'number' || Number.isFinite(v))) {
      out[k] = v;
    }
  }
  return out;
}

function haveClinicalInputs(ctx: Record<string, any>) {
  const keys = ['Na','K','Cl','HCO3','Glucose','BUN','Cr','Albumin','pH','pCO2','Osm_measured','Lactate'];
  return keys.some(k => ctx[k] !== undefined && Number.isFinite(num(ctx[k])));
}

// ---- Groq passthrough for non-clinical chat ----
async function streamViaGroq(messages: any[]) {
  const base  = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY || '';
  const url   = (base.replace(/\/$/,'')) + '/chat/completions';

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model, stream: true, temperature: 0, top_p: 1,
      frequency_penalty: 0, presence_penalty: 0, messages
    })
  });
  return upstream;
}

// ---- Main handler ----
export async function handle(req: NextRequest, payload: any) {
  const method = req.method || 'GET';
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const clientRequestId = payload?.clientRequestId;
  const mode = (payload?.mode || '').toString().toLowerCase();

  const now = Date.now();
  for (const [id, ts] of Array.from(recentReqs.entries())) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const prev = recentReqs.get(clientRequestId);
    if (prev && now - prev < 60_000) return corsify(new Response(null, { status: 409 }), { 'X-Chat-Route-Method': method });
    recentReqs.set(clientRequestId, now);
  }

  const nonSystem: Array<{role:string; content:string}> = [];
  for (const m of messages) if (m && m.role !== 'system') nonSystem.push(m);
  const userText = textFromMessages(nonSystem);

  const extracted = extractAll(userText) || {};
  const embedded  = extractEmbeddedJSONObject(userText) || {};
  const ctxRaw    = preferEmbedded(extracted, embedded);  // JSON wins
  const ctx       = canonicalizeCtx(ctxRaw);

  // Decide path: OpenAI verify (doctor/patient) vs Groq passthrough
  const modeWantsVerify = (mode === 'doctor' || mode === 'patient'); // leave therapy/research unchanged unless you add them here
  const hasClinical = haveClinicalInputs(ctx);

  if (modeWantsVerify && hasClinical) {
    const computed = computeAll(ctx) || [];
    const verdict = await verifyWithOpenAI({
      mode: String(mode || 'default'),
      ctx,
      computed,
      conversation: nonSystem.map(m => ({ role: m.role, content: m.content })),
      timeoutMs: Number(process.env.VERIFY_TIMEOUT_MS || 120000)
    });

    const finalText = (verdict && typeof verdict.final_text === 'string' && verdict.final_text.trim())
      ? verdict.final_text
      : (() => {
          // friendly local fallback (never robotic)
          const Num = (x:any)=> (typeof x==='number' ? x : Number(x));
          const has = (x:any)=> Number.isFinite(Num(x));
          const Na  = Num(ctx.Na), Cl = Num(ctx.Cl), HCO3 = Num(ctx.HCO3), Alb = Num(ctx.Albumin);
          const Glu = Num(ctx.Glucose), BUN = Num(ctx.BUN), Meas = Num(ctx.Osm_measured);
          const pH  = Num(ctx.pH), pCO2 = Num(ctx.pCO2);
          const ag   = (has(Na)&&has(Cl)&&has(HCO3)) ? +(Na - (Cl + HCO3)).toFixed(2) : undefined;
          const agc  = (ag!==undefined && has(Alb)) ? +(ag + 2.5*(4 - Alb)).toFixed(2) : undefined;
          const osm  = (has(Na)&&has(Glu)&&has(BUN)) ? +(2*Na + Glu/18 + BUN/2.8).toFixed(2) : undefined;
          const og   = (osm!==undefined && has(Meas)) ? +(Meas - osm).toFixed(2) : undefined;
          const win  = has(HCO3) ? +(1.5*HCO3 + 8).toFixed(2) : undefined;
          const labs: string[] = [];
          ([
            ['Na',Na],['K',Num(ctx.K)],['Cl',Cl],['HCO3',HCO3],['Glucose',Glu],['BUN',BUN],
            ['Cr',Num(ctx.Cr)],['Albumin',Alb],['pH',pH],['pCO2',pCO2],['Osm_measured',Meas],['Lactate',Num(ctx.Lactate)]
          ] as Array<[string, number]>).forEach(([k,v])=>{ if (has(v)) labs.push(`${k} ${v}`); });
          const derived: string[] = [];
          if (ag!==undefined)  derived.push(`AG ${ag}`);
          if (agc!==undefined) derived.push(`AG-corr ${agc}`);
          if (osm!==undefined) derived.push(`Serum osm ${osm}`);
          if (og!==undefined)  derived.push(`Osm gap ${og}`);
          if (win!==undefined) derived.push(`Winter’s expected pCO2 ${win}`);
          return `Clinical summary:\n• Labs: ${labs.join(', ')}\n• Derived: ${derived.join(', ') || 'not enough data to compute'}`;
        })();

    const stream = sseFromText(finalText);
    const timeoutMs = String(process.env.VERIFY_TIMEOUT_MS || 120000);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'X-Verify-Used': verdict ? '1' : '0',
        'X-Verify-Timeout': timeoutMs,   // frontend timer reads this
        'X-Chat-Route-Method': method
      }
    });
  }

  // Non-clinical or other modes: Groq passthrough (unchanged behavior)
  const upstream = await streamViaGroq(messages.filter(m => m && m.role));
  if (!upstream.ok) {
    const errTxt = await upstream.text();
    return corsify(new Response('LLM error: ' + errTxt, { status: 500 }), { 'X-Chat-Route-Method': method });
  }
  const h = new Headers(upstream.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  return new Response(upstream.body, { headers: h });
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
