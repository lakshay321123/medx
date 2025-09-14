import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Force non-basic chats to OpenAI final endpoints while preserving existing routes.
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  if (path === "/api/chat" || path === "/api/chat/stream") {
    const mode = (req.headers.get("x-medx-mode") || "").toLowerCase();
    const isBasic = mode === "basic" || mode === "casual";
    if (!isBasic) {
      url.pathname = path === "/api/chat" ? "/api/chat/final" : "/api/chat/stream-final";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/chat", "/api/chat/stream", "/api/triage-final"],
};
