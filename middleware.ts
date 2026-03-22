import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ALL chat traffic routes to OpenAI for accuracy.
// Groq routes remain available at /api/chat/stream for explicit use if needed.
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  if (path === "/api/chat" || path === "/api/chat/stream") {
    url.pathname = path === "/api/chat" ? "/api/chat/final" : "/api/chat/stream-final";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/chat", "/api/chat/stream", "/api/triage-final"],
};
