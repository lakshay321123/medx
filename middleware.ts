import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Previously this middleware redirected /api/chat/stream to /api/chat/stream-final
// (OpenAI, slow ~30-40s). Now all chat goes through the fast Groq streaming route.
// The OpenAI final route is available at /api/chat/stream-final for explicit use.
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/chat", "/api/chat/stream", "/api/triage-final"],
};
