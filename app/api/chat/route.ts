import { NextRequest, NextResponse } from 'next/server';
import { COUNTRIES } from '@/data/countries';
import { getContext, updateContext, resetContext } from '@/lib/contextManager';
import { detectIntent } from '@/lib/intentClassifier';
import { buildPrompt } from '@/lib/promptBuilder';

export async function POST(req: NextRequest){
  const body = await req.json();
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL_ID || 'llama3-8b-instruct';
  const key = process.env.LLM_API_KEY;
  if(!base || !key) return new NextResponse("LLM_BASE_URL or LLM_API_KEY not set", { status: 500 });

  if (body.sessionId && body.userQuery) {
    const { sessionId, userQuery, mode, reset } = body;

    if (reset) {
      resetContext(sessionId);
      return NextResponse.json({ message: 'Context reset' });
    }

    let ctx = getContext(sessionId);
    if (mode) {
      updateContext(sessionId, undefined, undefined, mode);
      ctx = getContext(sessionId);
    }

    const detected = detectIntent(userQuery);

    if (detected.intent === 'unknown' || detected.confidence < 0.6) {
      return NextResponse.json({
        response: `We were discussing ${ctx.mainTopic || 'this topic'}. Do you want to continue on that?`,
        expectAnswer: 'yes/no'
      });
    }

    const { intent } = detected;

    if (!ctx.mainTopic) {
      updateContext(sessionId, userQuery);
    } else {
      updateContext(sessionId, undefined, userQuery);
    }
    ctx = getContext(sessionId);

    const prompt = buildPrompt(ctx.mainTopic!, ctx.subtopics, ctx.mode, intent, userQuery);

    const res = await fetch(`${base.replace(/\/+$/,'')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
    });
    if (!res.ok) {
      const t = await res.text();
      return new NextResponse(`LLM error: ${t}`, { status: 500 });
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || '';

    const followUp = `Would you like to see related clinical trials or recent studies on ${ctx.mainTopic}?`;

    return NextResponse.json({ response: text, followUp });
  }

  // Fallback to existing behavior
  let messages = body.messages;
  if(!messages){
    const { question, role, country: code } = body;
    const country = COUNTRIES.find(c => c.code3 === code) || COUNTRIES.find(c => c.code3 === 'USA')!;
    const baseMsg = role==='clinician'
      ? 'You are a clinical assistant. Be precise, cite sources if mentioned. Avoid medical advice; provide evidence and guideline pointers.'
      : role==='admin'
        ? 'You help administrative staff with medical documents. Summarize logistics and coding info. Avoid medical advice.'
        : 'You explain in simple, friendly language for patients. Avoid medical advice; encourage consulting a doctor.';
    const sys = `You are MedX. User country: ${country.code3}.\nPrefer local guidelines, availability, dosing units, and OTC product examples used in ${country.name}.\nIf country-specific examples are uncertain, give generic names and note availability varies by region.\n` + baseMsg;
    messages = [
      { role: 'system', content: sys },
      { role: 'user', content: question }
    ];
  }

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
