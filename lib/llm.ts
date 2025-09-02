// lib/llm.ts

// Split long text into manageable chunks for the LLM
export function chunkText(text: string, maxChars = 12000) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) out.push(text.slice(i, i + maxChars));
  return out;
}

const DEFAULT_TIMEOUT = parseInt(process.env.DOC_TIMEOUT_MS || '30000', 10);
const DEBUG = process.env.DOC_ENABLE_DEBUG === 'true';

async function withTimeout<T>(p: Promise<T>, ms = DEFAULT_TIMEOUT, label = 'timeout'): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  return await Promise.race([
    p.then((v) => { if (t) clearTimeout(t); return v; }),
    new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(label)), ms); }),
  ]);
}

function normalizeBase(rawBase: string) {
  return rawBase.replace(/\/+$/, '').replace(/\/openai\/v1$/, '') + '/openai/v1';
}

async function callLLM(
  base: string,
  model: string,
  key: string | undefined,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  if (!key || !base || !model) throw new Error('missing-credentials');
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`http-${res.status}`);
    const j: any = await res.json().catch(() => ({}));
    return j?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(id);
  }
}

export const SCHEMA_PROMPT = `You are a clinical summarization assistant.\nReturn STRICT JSON first, then 2–3 sentences explanation.\n\nSchema expected:\n{\n  "labs": [ { "name":"", "value":"", "units":"", "ref_low":"", "ref_high":"", "flag":"", "page_range":"" } ],\n  "medications": [ { "drug":"", "dose":"", "route":"", "frequency":"", "duration":"", "page_range":"" } ],\n  "diagnoses": [ { "name":"", "page_range":"" } ],\n  "impressions": [ { "text":"", "page_range":"" } ],\n  "red_flags": [ { "text":"", "page_range":"" } ],\n  "followups": [ { "text":"", "page_range":"" } ]\n}`;

export async function askGroq(systemPrompt: string, userContent: string): Promise<string> {
  try {
    const base = normalizeBase(process.env.LLM_BASE_URL || 'https://api.groq.com');
    const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
    const key = process.env.LLM_API_KEY;
    return await callLLM(base, model, key, systemPrompt, userContent);
  } catch (e) {
    if (DEBUG) console.error('groq-error', e);
    throw e;
  }
}

export async function askOpenAI(systemPrompt: string, userContent: string): Promise<string> {
  try {
    const base = normalizeBase('https://api.openai.com');
    const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
    const key = process.env.OPENAI_API_KEY;
    return await callLLM(base, model, key, systemPrompt, userContent);
  } catch (e) {
    if (DEBUG) console.error('openai-error', e);
    throw e;
  }
}

async function safeJson(res: Response) {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { ok: res.ok, raw: txt };
  }
}

/**
 * Summarize an array of text chunks. Uses only LLM_* env vars.
 * Retained for backwards compatibility with previous code paths.
 */
export async function summarizeChunks(chunks: string[], systemPrompt: string): Promise<string> {
  const rawBase = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const base = normalizeBase(rawBase);
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key = process.env.LLM_API_KEY || '';

  if (!key || !base || !model || !Array.isArray(chunks) || chunks.length === 0) return '';

  const url = `${base}/chat/completions`;
  const parts: string[] = [];
  for (const c of chunks) {
    try {
      const r = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: c },
            ],
            temperature: 0.2,
          }),
        }),
        DEFAULT_TIMEOUT,
        'llm-timeout'
      );
      const j: any = await safeJson(r);
      const content = j?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) parts.push(content.trim());
    } catch (e) {
      if (DEBUG) console.error('summarize-error', e);
    }
  }
  return parts.join('\n\n').trim();
}

