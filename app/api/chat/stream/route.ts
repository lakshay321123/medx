import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/http';
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const base  = process.env.LLM_BASE_URL!;
    const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
    const key   = process.env.LLM_API_KEY!;
    const url = `${base.replace(/\/$/,'')}/chat/completions`;

    const upstream = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, stream: true, temperature: 0.2, messages })
    }, { timeoutMs: 25000, retries: 1 });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return new NextResponse(`Upstream error: ${text}`, { status: upstream.status });
    }

    return new Response(upstream.body, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
    });
  } catch (e:any) {
    return new NextResponse(`Upstream error: ${e?.message || e}`, { status: 500 });
  }
}
