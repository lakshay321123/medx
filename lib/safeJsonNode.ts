// lib/safeJsonNode.ts
export async function safeJsonNode<T = any>(res: Response): Promise<T | { ok: boolean; raw: string }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return { ok: (res as any)?.ok ?? false, raw: text };
  }
}
