const limits = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 15; // 15 requests per minute

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = limits.get(key);

  // Cleanup old entries periodically
  if (limits.size > 10000) {
    for (const [k, v] of limits.entries()) {
      if (v.resetAt < now) limits.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    limits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}
