// lib/llm.ts

// Split long text into manageable chunks for the LLM
export function chunkText(text: string, maxChars = 12000) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) out.push(text.slice(i, i + maxChars));
  return out;
}

function pickEnv() {
  const base =
    (process.env.LLM_BASE_URL?.replace(/\/+$/, '') || 'https://api.groq.com'); // default to Groq
  const model =
    (process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant'); // your default
  const key =
    (process.env.LLM_API_KEY || '');

  return { base, model, key };
}

async function safeJson(res: Response) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { ok: res.ok, raw: txt }; }
}

async function withTimeout<T>(p: Promise<T>, ms = 20000, label = 'timeout'): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  return await Promise.race([
    p.then((v) => { if (t) clearTimeout(t); return v; }),
    new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(label)), ms); }),
  ]);
}

/**
 * Summarize an array of text chunks. Uses only LLM_* env vars.
 * - If any env var is missing, returns '' (does not throw).
 * - Uses safe JSON parsing so bad payloads never crash.
 * - Adds a per-request timeout to avoid hanging uploads.
 */
export async function summarizeChunks(chunks: string[], systemPrompt: string): Promise<string> {
  const { base, model, key } = pickEnv();

  // If key or base/model missing, skip summarization quietly.
  if (!key || !base || !model || !Array.isArray(chunks) || chunks.length === 0) return '';

  const url = `${base}/v1/chat/completions`;
  const parts: string[] = [];

  for (const c of chunks) {
    try {
      const r = await withTimeout(fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: c },
          ],
          temperature: 0.2,
        }),
      }), 20000, 'llm-timeout');

      // Don’t assume JSON; parse safely
      const j: any = await safeJson(r);
      const content = j?.choices?.[0]?.message?.content;

      if (typeof content === 'string' && content.trim()) {
        parts.push(content.trim());
      } else {
        // If provider returns an error (e.g., invalid_api_key), just skip this chunk
        // You can optionally log: console.error('LLM error payload:', j);
      }
    } catch (e) {
      // Swallow request/timeout errors to keep the upload flow resilient
      // Optionally: console.error('LLM request failed:', e);
    }
  }

  return parts.join('\n\n').trim();
}
