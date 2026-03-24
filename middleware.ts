import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Note: Edge middleware can't import Node.js modules, so we inline a lightweight
// rate limiter here. The lib/rateLimit.ts version is used in API routes directly.

const limits = new Map<string, { count: number; resetAt: number }>();

function edgeRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const e = limits.get(key);
  if (limits.size > 10_000) {
    for (const [k, v] of limits.entries()) { if (v.resetAt < now) limits.delete(k); }
  }
  if (!e || e.resetAt < now) { limits.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= max) return false;
  e.count++;
  return true;
}

function getTier(path: string): number {
  if (path.startsWith("/api/chat") || path.startsWith("/api/aidoc")) return 15;
  if (path.startsWith("/api/auth")) return 10;
  if (path === "/api/health") return 200;
  return 60; // default for all other API routes
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // --- Rate limiting for ALL /api/ routes ---
  if (path.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const tier = getTier(path);
    const rateLimitKey = `${ip}:${path.startsWith("/api/chat") ? "chat" : path.startsWith("/api/auth") ? "auth" : "api"}`;

    if (!edgeRateLimit(rateLimitKey, tier)) {
      return new NextResponse("Rate limit exceeded. Please wait a moment.", {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
          "Content-Type": "text/plain",
        },
      });
    }
  }

  // --- Chat routing: rewrite /api/chat to stream-final (OpenAI) ---
  if (path === "/api/chat" || path === "/api/chat/stream") {
    url.pathname = path === "/api/chat" ? "/api/chat/final" : "/api/chat/stream-final";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
