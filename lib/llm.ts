export type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };
export type ResponseFormat = { type: string; [key: string]: any };

const GROQ_URL   = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_KEY   = process.env.LLM_API_KEY!;
const GROQ_MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-70b-versatile';

const OAI_URL   = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OAI_KEY   = process.env.OPENAI_API_KEY!;
const OAI_TEXT  = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const OAI_VISON = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

// --- Groq (text)
export async function groqChat(messages: ChatMsg[], model = GROQ_MODEL, temperature = 0.2) {
  if (!GROQ_KEY) throw new Error('LLM_API_KEY (Groq) missing');
  const r = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ model, messages, temperature })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Groq: ${j?.error?.message || r.statusText}`);
  return j.choices?.[0]?.message?.content || '';
}

// --- OpenAI (text)
export async function openaiText(messages: ChatMsg[], model = OAI_TEXT, temperature = 0.2) {
  if (!OAI_KEY) throw new Error('OPENAI_API_KEY missing');
  const r = await fetch(`${OAI_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OAI_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ model, messages, temperature })
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


export type CallLLMArgs = {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  response_format?: ResponseFormat;
};

export async function callLLM({
  system,
  prompt,
  temperature = 0.1,
  maxTokens,
  response_format
}: CallLLMArgs) {
  if (!OAI_KEY) throw new Error('OPENAI_API_KEY missing');

  const primary = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
  const fallbacks = (process.env.OPENAI_FALLBACK_MODELS || 'gpt-4o,gpt-4o-mini')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const models = [...new Set([primary, ...fallbacks])];

  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: prompt }
  ];

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  let lastError: unknown;

  for (const model of models) {
    try {
      const body: any = { model, messages };
      if (maxTokens) body.max_tokens = maxTokens;
      if (response_format) body.response_format = response_format;
      if (!/^gpt-5/i.test(model)) body.temperature = temperature;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${OAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data?.error?.message || res.statusText;
        throw new Error(`OpenAI ${model}: ${message}`);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (content) return content as string;
      lastError = new Error('OpenAI response missing content');
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('LLM call failed');
}


export function createLLM() {
  return {
    async chat({ messages, temperature = 0.2, max_tokens = 1200, response_format }: { messages: ChatMsg[]; temperature?: number; max_tokens?: number; response_format?: any }) {
      if (!GROQ_KEY) throw new Error('LLM_API_KEY (Groq) missing');
      const body: any = { model: GROQ_MODEL, messages, temperature, max_tokens };
      if (response_format) body.response_format = response_format;
      const r = await fetch(`${GROQ_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`Groq: ${j?.error?.message || r.statusText}`);
      const content = j?.choices?.[0]?.message?.content || '';
      return { content };
    }
  };
}
