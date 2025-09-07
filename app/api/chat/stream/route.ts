import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { classifyAct } from '@/lib/nlu/markers';
import { politeAck, suggestNextByContext } from '@/lib/text/polish';
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages = [], threadId, context } = body;
  const history = messages;
  const lastUser = [...history].reverse().find((m: any) => m.role === 'user');
  const userText: string = lastUser?.content ?? '';
  const lastAssistant = [...history].reverse().find((m: any) => m.role === 'assistant');
  const lastTopic =
    lastAssistant?.meta?.topic ||
    // Fallback: try to extract a topic-ish hint from last assistant title/heading
    lastAssistant?.title ||
    lastAssistant?.topic ||
    undefined;

  const act = classifyAct(userText, lastTopic);

  // If it's an acknowledgment, short-circuit with a warm, context-tied reply.
  if (act === 'ack') {
    const nextActions = suggestNextByContext(lastTopic);
    const text = politeAck({ topic: lastTopic, nextActions }, 'warm');
    return new Response(
      JSON.stringify({ reply: text, meta: { act, topic: lastTopic, handledBy: 'ack-shortcircuit' } }),
      { headers: { 'content-type': 'application/json' } }
    );
  }

  const base  = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url = `${base.replace(/\/$/,'')}/chat/completions`;

  let finalMessages = messages;
  if (threadId === 'med-profile' || context === 'profile') {
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
      finalMessages = [{ role: 'system', content: sys }, ...messages];
    } catch {}
  }

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, stream: true, temperature: 0.2, messages: finalMessages })
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
