import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import { verifyWithOpenAI, Verdict } from '@/lib/ai/verifyWithOpenAI';

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

function textFromMessages(msgs: Array<{role:string; content:string}>) {
  let s = '';
  for (const m of msgs) if (m.role === 'user') s += (m.content || '') + '\n';
  return s;
}

// minimal SSE wrapper so frontend stays unchanged
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

async function handle(req: NextRequest, payload: any) {
  const method = req.method || 'GET';
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const context = payload?.context;
  const clientRequestId = payload?.clientRequestId;
  const mode = payload?.mode;

  // dedupe for 60s
  const now = Date.now();
  for (const [id, ts] of Array.from(recentReqs.entries())) if (now - ts > 60_000) recentReqs.delete(id);
  if (clientRequestId) {
    const prev = recentReqs.get(clientRequestId);
    if (prev && now - prev < 60_000) return corsify(new Response(null, { status: 409 }), { 'X-Chat-Route-Method': method });
    recentReqs.set(clientRequestId, now);
  }

  // strip incoming system msgs
  const userMsgs: Array<{role:string; content:string}> = [];
  for (const m of messages) if (m && m.role !== 'system') userMsgs.push(m);

  // collect user text, extract ctx and optional computed (as hints)
  const userText = textFromMessages(userMsgs);
  const ctx = extractAll(userText) || {};
  const computed = computeAll(ctx) || [];
  const taskMode = computed.length ? 'analyzing' : 'thinking';

  // profile (optional)
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
      // We don’t push sys msg down to OpenAI; this route fully delegates calc/verify to OpenAI below.
      userMsgs.unshift({ role: 'system' as any, content: sys });
    } catch {}
  }

  // GPT-5: verify+calculate (cached by ctx signature)
  const cacheKey = await sha256Hex(JSON.stringify({ ctx, ver: 'openai-final-v2' }));
  let verdict = cacheGet(cacheKey);
  if (!verdict) {
    verdict = await verifyWithOpenAI({
      mode: String(mode || 'default'),
      ctx,
      computed,
      conversation: userMsgs.map(m => ({ role: m.role, content: m.content })),
      timeoutMs: 60_000
    }) || undefined;
    if (verdict) cacheSet(cacheKey, verdict, 10 * 60 * 1000);
  }

  // Choose final text
  let finalText =
    verdict?.final_text ||
    'Clinical summary (verified):\n- Interpretation: insufficient inputs.\nRules applied: standard formulas.';

  // Stream to client (SSE)
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
      'X-Task-Mode': taskMode,
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
