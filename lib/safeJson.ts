// lib/safeJson.ts
// Never call res.json() blindly. Parse text first; attempt JSON; otherwise return a JSON-safe shape.
export async function safeJson<T = any>(res: Response): Promise<T | { ok: boolean; raw: string }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return { ok: res.ok, raw: text };
  }
}
