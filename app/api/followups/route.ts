import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { lastUserQuestion, lastAssistantText } = await req.json();
  const base  = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;

  const prompt = `
You are a follow-up generator. Given the user's topic and the assistant's answer, return 3 SHORT, TOPICAL follow-up questions that help the user go deeper.
- Keep them focused on the SAME condition/medication/topic.
- 6-10 words each max.
- No chit-chat.
- Return as a JSON array of strings ONLY.
`;

  const res = await fetch(`${base.replace(/\/$/,'')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, temperature: 0.1,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Topic: ${lastUserQuestion}\nAnswer:\n${lastAssistantText}\n\nJSON:` }
      ]
    })
  });

  if (!res.ok) return new NextResponse('Followups error', { status: 500 });
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content || '[]';
  let items: string[] = [];
  try { items = JSON.parse(text); } catch { items = []; }
  return NextResponse.json({ followups: items.slice(0,3) });
}
