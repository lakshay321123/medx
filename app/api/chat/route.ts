import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest){
  const { question, role } = await req.json();
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL_ID || 'llama3-8b-instruct';
  if(!base) return new NextResponse("LLM_BASE_URL not set", { status: 500 });

  // OpenAI-compatible completion (v1/chat/completions)
  const res = await fetch(`${base.replace(/\/$/,'')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: role==='clinician' ? 'You are a clinical assistant. Be precise, cite sources if mentioned. Avoid medical advice; provide evidence and guideline pointers.' : 'You explain in simple, friendly language for patients. Avoid medical advice; encourage consulting a doctor.' },
        { role: 'user', content: question }
      ],
      temperature: 0.2
    })
  });
  if(!res.ok){
    const t = await res.text();
    return new NextResponse(`LLM error: ${t}`, { status: 500 });
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || "";
  return new NextResponse(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
}
