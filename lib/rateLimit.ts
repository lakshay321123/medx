const limits = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute

// Tiered rate limits per route category
export const RATE_LIMITS: Record<string, number> = {
  chat: 15,       // /api/chat/* — 15 per minute (LLM-heavy)
  auth: 10,       // /api/auth/* — 10 per minute (prevent brute force)
  write: 30,      // POST/PUT/DELETE on data routes — 30 per minute
  read: 60,       // GET on data routes — 60 per minute
  health: 120,    // /api/health — health checks
};

/**
 * Classify an API route into a rate limit tier.
 */
export function classifyRoute(pathname: string, method: string): string {
  if (pathname.startsWith("/api/chat") || pathname.startsWith("/api/aidoc")) return "chat";
  if (pathname.startsWith("/api/auth")) return "auth";
  if (pathname === "/api/health") return "health";
  if (method === "GET" || method === "HEAD") return "read";
  return "write";
}

export function checkRateLimit(
  key: string,
  maxRequests: number = 15,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = limits.get(key);

  // Cleanup old entries periodically
  if (limits.size > 10_000) {
    for (const [k, v] of limits.entries()) {
      if (v.resetAt < now) limits.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    limits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}
