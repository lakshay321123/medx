import { withRetries } from '@/lib/llm/retry';
export type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };
// LLM_* ← Groq (OpenAI-compatible endpoint)
const GROQ_URL   = (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
const GROQ_KEY   = process.env.LLM_API_KEY!;
const GROQ_MODEL = process.env.LLM_MODEL_ID || 'llama-3.1-70b-versatile';
const GROQ_FALLBACK = process.env.LLM_FALLBACK_MODEL_ID || 'llama-3.1-8b-instant';

const OAI_URL   = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OAI_KEY   = process.env.OPENAI_API_KEY!;
const OAI_TEXT  = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const OAI_VISON = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

// --- Groq (text)
export async function groqChat(messages: ChatMsg[], opts?: { temperature?: number; max_tokens?: number; stream?: boolean }) {
  if (!GROQ_KEY) throw new Error('LLM_API_KEY (Groq) missing');
  const body: any = {
    model: GROQ_MODEL,
    messages,
    temperature: opts?.temperature ?? 0.2,
    max_tokens: opts?.max_tokens,
    stream: opts?.stream ?? false,
  };
  return withRetries(async () => {
    const r = await fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify(body),
      // @ts-ignore
      timeout: 30000
    });
    if (r.ok) return r.json();
    const text = await r.text();
    try {
      const j = JSON.parse(text);
      const code = j?.error?.code || j?.error?.type;
      if ((r.status === 404 || code === 'model_not_found' || code === 'invalid_model') && GROQ_FALLBACK && GROQ_FALLBACK !== GROQ_MODEL) {
        const r2 = await fetch(`${GROQ_URL}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({ ...body, model: GROQ_FALLBACK })
        });
        if (r2.ok) return r2.json();
      }
    } catch {}
    throw new Error(`Groq error ${r.status}: ${text}`);
  });
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

