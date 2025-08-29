import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { question, role } = await req.json();

  const base  = process.env.LLM_BASE_URL;                  // e.g. https://api.groq.com/openai/v1
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY;                   // gsk_...

  if (!base) return new NextResponse('LLM_BASE_URL not set', { status: 500 });
  if (!key)  return new NextResponse('LLM_API_KEY not set',  { status: 500 });

  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: role === 'clinician'
            ? 'You are a clinical assistant. Use markdown with headings and bullet points. Avoid medical advice.'
            : 'You explain in simple language for patients. Use short paragraphs and markdown. Avoid medical advice.' },
        { role: 'user', content: question }
      ],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const err = await res.text();
    return new NextResponse(`LLM error: ${err}`, { status: 500 });
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '';
  return new NextResponse(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
