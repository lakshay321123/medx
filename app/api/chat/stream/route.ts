import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
// === [MEDX_CALC_ROUTE_IMPORTS_START] ===
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';
// === [MEDX_CALC_ROUTE_IMPORTS_END] ===
export const runtime = 'edge';

const recentReqs = new Map<string, number>();


export async function POST(req: NextRequest) {
  const { messages = [], context, clientRequestId, mode } = await req.json();
  const now = Date.now();
  for (const [id, ts] of recentReqs.entries()) {
    if (now - ts > 60_000) recentReqs.delete(id);
  }
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) {
      return new Response(null, { status: 409 });
    }
    recentReqs.set(clientRequestId, now);
  }
  const base  = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url = `${base.replace(/\/$/,'')}/chat/completions`;

  let finalMessages = messages.filter((m: any) => m.role !== 'system');

  const userText = (messages || []).map((m: any) => m?.content || '').join('\n');
  const ctx = extractAll(userText);
  const computed = computeAll(ctx);

  if (computed.length) {
    const lines = computed.map(r => {
      const val = r.unit ? `${r.value} ${r.unit}` : String(r.value);
      const notes = r.notes?.length ? ` — ${r.notes.join('; ')}` : '';
      return `${r.label}: ${val}${notes}`;
    });
    finalMessages = [
      {
        role: 'system',
        content:
          'Use the pre-computed clinical values below exactly. Do not re-calculate. If inputs are missing, state which values are required.'
      },
      { role: 'system', content: lines.join('\n') },
      ...finalMessages,
    ];
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
        summary: s.summary || s.text || '',
        reasons: s.reasons || '',
        profile: p?.profile || p || null,
        packet: pk.text || '',
      });
      finalMessages = [{ role: 'system', content: sys }, ...finalMessages];
    } catch {}
  }
  // === [MEDX_CALC_PRELUDE_START] ===
  const latestUserMessage = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || "";
  const __calcPrelude = composeCalcPrelude(latestUserMessage ?? "");
  if (__calcPrelude) {
    finalMessages = [{ role: 'system', content: __calcPrelude }, ...finalMessages];
  }
  // === [MEDX_CALC_PRELUDE_END] ===

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
    return new Response(`LLM error: ${err}`, { status: 500 });
  }

  // Pass-through SSE; frontend parses "data: {delta.content}"
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
  });
}
