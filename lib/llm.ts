export async function summarizeChunks(chunks: string[], systemPrompt: string) {
  const url = process.env.LLM_BASE_URL?.replace(/\/+$/, '') + '/v1/chat/completions';
  const model = process.env.LLM_MODEL_ID;
  const key   = process.env.LLM_API_KEY;

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    const res = await fetch(url!, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: chunks[i] }
        ],
        temperature: 0.2,
      }),
    });

    const j = await res.json().catch(()=>null);
    const content = j?.choices?.[0]?.message?.content || '';
    parts.push(content);
  }

  return parts.join('\n\n');
}

// Utility: split long text into manageable chunks for the LLM
export function chunkText(text: string, maxChars = 12000) {
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    out.push(text.slice(start, start + maxChars));
    start += maxChars;
    }
  return out;
}

