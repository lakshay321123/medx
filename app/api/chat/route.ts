import { NextRequest, NextResponse } from 'next/server';
import { COUNTRIES } from '@/data/countries';

export async function POST(req: NextRequest){
  const body = await req.json();
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL_ID || 'llama3-8b-instruct';
  const key = process.env.LLM_API_KEY;
  if(!base || !key) return new NextResponse("LLM_BASE_URL or LLM_API_KEY not set", { status: 500 });

  // Allow either a raw question/role pair or full chat messages
  let messages = body.messages;
  if(!messages){
    const { question, role, country: code } = body;
    const country = COUNTRIES.find(c => c.code3 === code) || COUNTRIES.find(c => c.code3 === 'USA')!;
    const base = role==='clinician'
      ? 'You are a clinical assistant. Be precise, cite sources if mentioned. Avoid medical advice; provide evidence and guideline pointers.'
      : role==='admin'
        ? 'You help administrative staff with medical documents. Summarize logistics and coding info. Avoid medical advice.'
        : 'You explain in simple, friendly language for patients. Avoid medical advice; encourage consulting a doctor.';
    const sys = `You are MedX. User country: ${country.code3}.\nPrefer local guidelines, availability, dosing units, and OTC product examples used in ${country.name}.\nIf country-specific examples are uncertain, give generic names and note availability varies by region.\nAlways keep answers scoped to the user’s current topic unless they change it.\nIf the question is ambiguous, ask ONE brief clarifying question, then answer briefly.\nEnd every answer with one short follow-up question (<=10 words) on the same topic.` + base;
    messages = [
      { role: 'system', content: sys },
      { role: 'user', content: question }
    ];
  }

  // OpenAI-compatible completion (v1/chat/completions)
  const res = await fetch(`${base.replace(/\/+$/,'')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.2 })
  });
  if(!res.ok){
    const t = await res.text();
    return new NextResponse(`LLM error: ${t}`, { status: 500 });
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || "";
  return new NextResponse(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
}
