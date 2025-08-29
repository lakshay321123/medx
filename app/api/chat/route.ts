import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest){
  const { question, role } = await req.json();
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL_ID || 'llama3-8b-instruct';
  if(!base) return new NextResponse("LLM_BASE_URL not set", { status: 500 });

  const sys = role==='clinician'
    ? `You are a clinical assistant. Use concise markdown with headings and bullet lists.
If CONTEXT contains codes or trials, include a "Sources" section with clickable links.
Do NOT provide diagnosis or treatment. Add a plain-language caution to consult a clinician.`
    : `You are a patient-friendly explainer. Short paragraphs, simple words.
If CONTEXT contains codes or trials, add a "Sources" section with clickable links.
Do NOT provide medical advice; suggest speaking with a clinician.`;

  // OpenAI-compatible completion (v1/chat/completions)
  const res = await fetch(`${base.replace(/\/$/,'')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: sys },
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
