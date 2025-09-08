import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { messages = [], threadId, context } = await req.json();
const key   = process.env.OPENAI_API_KEY!;
const model = process.env.MODEL_BALANCED || "gpt-4.1";
const url   = "https://api.openai.com/v1/chat/completions";

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
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      temperature: 0.2,
      stream: true,
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
