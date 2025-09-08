import { llmCall } from "@/lib/llm/call";
import { openai } from "@/lib/llm/openai";
import type { Tier } from "@/lib/llm/openai";

export { llmCall as callLLM } from "@/lib/llm/call";

export type ChatMsg = { role: 'system'|'user'|'assistant'; content: string };

// --- OpenAI (text) via tiered call
export async function openaiText(messages: ChatMsg[], tier: Tier = "smart", temperature = 0.2) {
  const msg = await llmCall(messages, { tier, temperature });
  return msg?.content || '';
}

// --- OpenAI Vision (image_url or base64 data URL)
export async function openaiVision({ system, prompt, imageDataUrl, model = "gpt-4o-mini", temperature = 0.2 }:{
  system: string; prompt: string; imageDataUrl: string; model?: string; temperature?: number;
}) {
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
  const resp = await openai.chat.completions.create({ model, messages, temperature });
  return resp.choices?.[0]?.message?.content || '';
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

