import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const base  = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url = `${base.replace(/\/$/,'')}/chat/completions`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, stream: true, temperature: 0.2, messages })
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(`LLM error: ${err}`, { status: 500 });
  }

  const reader = upstream.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.startsWith('data:')) continue;
          const json = part.replace(/^data:\s*/, '');
          if (json === '[DONE]') { controller.close(); return; }
          try {
            const obj = JSON.parse(json);
            const delta = obj.choices?.[0]?.delta?.content || '';
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {}
        }
      }
      controller.close();
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
