// lib/safeJson.ts
export async function safeJson(res: Response) {
  const text = await res.text();     // always read full body
  try {
    return JSON.parse(text);         // return parsed JSON if valid
  } catch {
    return { ok: res.ok, raw: text }; // fallback safe object
  }
}
