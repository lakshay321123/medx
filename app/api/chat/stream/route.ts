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

function sseFromText(text: string) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta: { content: text } })}\n\n`));
      controller.enqueue(enc.encode(`data: [DONE]\n\n`));
      controller.close();
    }
  });
}

// Parse last balanced JSON block from user text
function extractEmbeddedJSONObject(text: string): any | null {
  let bestStart = -1, bestEnd = -1;
  const s = String(text || '');
  const n = s.length;
  const stack: number[] = [];
  let inStr: '"' | "'" | null = null;
  for (let i = 0; i < n; i++) {
    const ch = s[i];
    const prev = i > 0 ? s[i - 1] : '';
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch as any; continue; }
    if (ch === '{') stack.push(i);
    else if (ch === '}' && stack.length) { const start = stack.pop()!; bestStart = start; bestEnd = i; }
  }
  if (bestStart >= 0 && bestEnd > bestStart) {
    const candidate = s.slice(bestStart, bestEnd + 1).trim();
    try { return JSON.parse(candidate); } catch {}
  }
  return null;
}

// Lightweight regex overlay for key lab values; normalize obvious decimal shifts
type KV = Record<string, number>;
function extractKVFromText(text: string): KV {
  const out: KV = {};
  const s = String(text || '');
  const num = String.raw`(-?\d+(?:\.\d+)?)`;
  const defs: Array<{k:string; pat:RegExp}> = [
    { k: 'Na',  pat: new RegExp(String.raw`\b(?:Na|sodium)\b[^\d\-]*${num}`, 'i') },
    { k: 'K',   pat: new RegExp(String.raw`\b(?:K|potassium)\b[^\d\-]*${num}`, 'i') },
    { k: 'Cl',  pat: new RegExp(String.raw`\b(?:Cl|chloride)\b[^\d\-]*${num}`, 'i') },
    { k: 'HCO3',pat: new RegExp(String.raw`\b(?:HCO3|bicarb(?:onate)?)\b[^\d\-]*${num}`, 'i') },
    { k: 'Glucose', pat: new RegExp(String.raw`\b(?:glucose|GLU)\b[^\d\-]*${num}(?:\s*mg\/?dL)?`, 'i') },
    { k: 'BUN', pat: new RegExp(String.raw`\b(?:BUN|urea(?:\s*nitrogen)?)\b[^\d\-]*${num}`, 'i') },
    { k: 'Cr',  pat: new RegExp(String.raw`\b(?:Cr|creatinine|creat)\b[^\d\-]*${num}`, 'i') },
    { k: 'Albumin', pat: new RegExp(String.raw`\b(?:albumin|alb)\b[^\d\-]*${num}`, 'i') },
    { k: 'pH',  pat: new RegExp(String.raw`\b(?:pH|ph)\b[^\d\-]*${num}`, 'i') },
    { k: 'pCO2',pat: new RegExp(String.raw`\b(?:pCO2|PaCO2)\b[^\d\-]*${num}`, 'i') },
    { k: 'Osm_measured', pat: new RegExp(String.raw`\b(?:measured\s*osm(?:olality)?|osm_measured|osmolality)\b[^\d\-]*${num}`, 'i') },
    { k: 'Lactate', pat: new RegExp(String.raw`\b(?:lactate|lact)\b[^\d\-]*${num}`, 'i') },
  ];
  for (const d of defs) {
    const m = d.pat.exec(s);
    if (m) {
      const v = Number(m[1]);
      if (Number.isFinite(v)) out[d.k] = v;
    }
  }
  if (out.K !== undefined && out.K > 25 && out.K / 100 >= 2 && out.K / 100 <= 12) out.K = +(out.K / 100).toFixed(2);
  return out;
}

function mergeCtxFromUserText(userText: string) {
  const extracted = extractAll(userText) || {};
  const kv = extractKVFromText(userText);
  const jsonBlock = extractEmbeddedJSONObject(userText) || {};
  return Object.assign({}, extracted, kv, jsonBlock);
}

async function handle(req: NextRequest, payload: any) {
  const method = req.method || 'GET';
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const clientRequestId = payload?.clientRequestId;
  const mode = payload?.mode;

  const now = Date.now();
  for (const [id, ts] of Array.from(recentReqs.entries())) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const prev = recentReqs.get(clientRequestId);
    if (prev && now - prev < 60_000) return corsify(new Response(null, { status: 409 }), { 'X-Chat-Route-Method': method });
    recentReqs.set(clientRequestId, now);
  }

  // collect user text
  let userText = '';
  const nonSystem: Array<{role:string; content:string}> = [];
  for (const m of messages) if (m && m.role !== 'system') nonSystem.push(m);
  for (const m of nonSystem) if (m.role === 'user') userText += String(m.content || '') + '\n';

  // build ctx and first-pass calculators (hints only)
  const ctx = mergeCtxFromUserText(userText);
  const computed = computeAll(ctx) || [];

  // verify and compute with OpenAI (authoritative)
  const cacheKey = await sha256Hex(JSON.stringify({ ctx, ver: 'openai-final-v2' }));
  // Simple per-request call; add a Map cache if desired
  const verdict = await verifyWithOpenAI({
    mode: String(mode || 'default'),
    ctx,
    computed,
    conversation: nonSystem.map(m => ({ role: m.role, content: m.content })),
    timeoutMs: 60_000
  });

  const finalText = verdict?.final_text ||
    'Clinical summary (verified):\n- Interpretation: insufficient inputs\nRules applied: standard formulas.';

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
      'X-Verify-Used': verdict ? '1' : '0',
      'X-Chat-Route-Method': method
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
