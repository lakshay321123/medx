const OAI_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';

export async function callOpenAIJson({ system, user, instruction }:{ system: string; user: string; instruction: string; }) {
  if (!OAI_KEY) throw new Error('OPENAI_API_KEY missing');
  const messages = [
    { role: 'system', content: `${system}\n${instruction}` },
    { role: 'user', content: user }
  ];
  const r = await fetch(`${OAI_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OAI_MODEL, messages, temperature: 0, response_format: { type: 'json_object' } })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`OpenAI: ${j?.error?.message || r.statusText}`);
  const content = j.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

