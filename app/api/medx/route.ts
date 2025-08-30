import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  const body = await req.json();
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL_ID || 'llama3-8b-instruct';
  if(!base) return new NextResponse('LLM_BASE_URL not set', { status: 500 });

  const roleNote = body?.meta?.mode === 'doctor'
    ? 'Audience is a clinician. Prefer codes, guidelines, succinct bullets.'
    : 'Audience is a general user. Avoid jargon; keep it actionable and safe.';

  const system = `You are MedX, a careful medical assistant.\nCountry: ${body?.meta?.countryCode || 'Unknown'}.\n${roleNote}\nMedication guidance: prefer generics; cite local regulators when relevant; avoid specific dosing unless safe & asked; flag red-flags.`;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: body.query }
  ];

  const res = await fetch(`${base.replace(/\/$/,'')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.2, messages })
  });
  if(!res.ok){
    const t = await res.text();
    return new NextResponse(`LLM error: ${t}`, { status: 500 });
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '';
  return NextResponse.json({ text });
}
