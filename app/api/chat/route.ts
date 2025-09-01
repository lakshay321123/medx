import { NextRequest } from 'next/server';
import { safeJson } from '@/lib/safeJson';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL_ID || 'llama3-8b-instruct';
  const key = process.env.LLM_API_KEY;
  if (!base) {
    return Response.json({ ok: false, error: { code: 'missing_base_url', message: 'LLM_BASE_URL not set' } }, { status: 500 });
  }

  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({
      ok: false,
      error: { code: 'upstream_failed', message: err.slice(0, 200) },
    });
  }

  const json = await safeJson(res);
  const text = json.choices?.[0]?.message?.content || '';
  return Response.json({ ok: true, data: { role: 'assistant', content: text, citations: json.citations ?? undefined } });
}
