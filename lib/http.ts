export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, opts?: { timeoutMs?: number }) {
  const { timeoutMs = 10000 } = opts || {};
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...(init || {}), signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
