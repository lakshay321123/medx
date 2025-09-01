export function chunkText(text: string, maxChars = 12000) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) out.push(text.slice(i, i + maxChars));
  return out;
}

export async function summarizeChunks(chunks: string[], systemPrompt: string) {
  const url = process.env.LLM_BASE_URL?.replace(/\/+$/,'') + '/v1/chat/completions';
  const model = process.env.LLM_MODEL_ID;
  const key   = process.env.LLM_API_KEY;
  if (!url || !model || !key) return '';

  const parts: string[] = [];
  for (const c of chunks) {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: c }
        ],
        temperature: 0.2,
      }),
    });

    const j = await r.json().catch(()=>null);
    parts.push(j?.choices?.[0]?.message?.content || '');
  }
  return parts.join('\n\n').trim();
}
