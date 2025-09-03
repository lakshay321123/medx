export async function moderate(text: string) {
  const key = process.env.OPENAI_API_KEY;
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  if (!key) return null;
  try {
    const r = await fetch(`${base}/moderations`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text })
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
