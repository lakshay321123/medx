import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const payload = {
    model: process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant',
    stream: true,
    messages
  };

  const base = process.env.LLM_BASE_URL || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.LLM_API_KEY) headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;

  const upstream = await fetch(`${base.replace(/\/$/,'')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('LLM upstream error', { status: 500 });
  }
  return new Response(upstream.body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
