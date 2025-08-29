// lib/http.ts
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  { timeoutMs = 15000, retries = 1 }: { timeoutMs?: number; retries?: number } = {}
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return res;
    } catch (err) {
      clearTimeout(t);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  // Unreachable
  throw new Error('fetchWithTimeout: exhausted retries');
}
