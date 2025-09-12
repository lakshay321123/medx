export type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };

const GROQ_URL   = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_KEY   = process.env.LLM_API_KEY!;
const GROQ_MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-70b-versatile';

const OAI_URL   = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OAI_KEY   = process.env.OPENAI_API_KEY!;
const OAI_TEXT  = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const OAI_VISON = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

// --- Groq (text)
export async function groqChat(
  opts: any,
  modelArg?: string,
  temperatureArg?: number
) {
  if (!GROQ_KEY) throw new Error('LLM_API_KEY (Groq) missing');
  let messages: ChatMsg[] = [];
  let model = GROQ_MODEL;
  let temperature = 0.2;
  let max_tokens: number | undefined;

  if (Array.isArray(opts)) {
    messages = opts;
    model = modelArg || GROQ_MODEL;
    temperature = temperatureArg ?? 0.2;
  } else {
    const { system, messages: msgs, model: m, temperature: t, max_tokens: mt } = opts;
    messages = system ? [{ role: 'system', content: system }, ...msgs] : msgs;
    model = m || GROQ_MODEL;
    temperature = t ?? 0.2;
    max_tokens = mt;
  }

  const body: any = { model, messages, temperature };
  if (max_tokens !== undefined) body.max_tokens = max_tokens;

  const r = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Groq: ${j?.error?.message || r.statusText}`);
  return j.choices?.[0]?.message?.content || '';
}

// --- OpenAI (text)
export async function openaiText(
  opts: any,
  modelArg?: string,
  temperatureArg?: number
) {
  if (!OAI_KEY) throw new Error('OPENAI_API_KEY missing');
  let messages: ChatMsg[] = [];
  let model = OAI_TEXT;
  let temperature = 0.2;
  let max_tokens: number | undefined;
  let response_format: any;

  if (Array.isArray(opts)) {
    messages = opts;
    model = modelArg || OAI_TEXT;
    temperature = temperatureArg ?? 0.2;
  } else {
    const { system, messages: msgs, model: m, temperature: t, max_tokens: mt, response_format: rf } = opts;
    messages = system ? [{ role: 'system', content: system }, ...msgs] : msgs;
    model = m || OAI_TEXT;
    temperature = t ?? 0.2;
    max_tokens = mt;
    response_format = rf;
  }

  const body: any = { model, messages, temperature };
  if (max_tokens !== undefined) body.max_tokens = max_tokens;
  if (response_format !== undefined) body.response_format = response_format;

  const r = await fetch(`${OAI_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OAI_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`OpenAI: ${j?.error?.message || r.statusText}`);
  return j.choices?.[0]?.message?.content || '';
}

// --- OpenAI Vision (image_url or base64 data URL)
export async function openaiVision({ system, prompt, imageDataUrl, model = OAI_VISON, temperature = 0.2 }:{
  system: string; prompt: string; imageDataUrl: string; model?: string; temperature?: number;
}) {
  if (!OAI_KEY) throw new Error('OPENAI_API_KEY missing');
  const messages = [
    { role:'system', content: system },
    {
      role:'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageDataUrl } }
      ]
    }
  ];
  const r = await fetch(`${OAI_URL}/chat/completions`, {
    method:'POST',
    headers: { Authorization:`Bearer ${OAI_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ model, messages, temperature })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`OpenAI Vision: ${j?.error?.message || r.statusText}`);
  return j.choices?.[0]?.message?.content || '';
}

// --- Simple merge: keep unique sentences in arrival order
export function mergeSummaries(...texts: string[]): string {
  const seen = new Set<string>(), keep:string[] = [];
  texts.forEach(t => (t||'').split(/(?<=[.!?])\s+/).forEach(s=>{
    const k = s.trim(); if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); keep.push(k); }
  }));
  return keep.join(' ');
}

// --- Lightweight helper for client-side prompts
export async function askLLM({ prompt, mode }:{ prompt: string; mode?: string }) {
  try {
    await fetch('/api/medx', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ query: prompt, mode })
    });
  } catch {
    // no-op
  }
}

