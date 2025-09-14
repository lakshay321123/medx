import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Force non-basic chats to OpenAI final endpoints while preserving your existing routes.
// If the client sends `x-medx-mode: basic`, we let Groq/basic paths proceed untouched.
// Memory/context code in existing handlers remains intact, we just rewrite the URL.

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // Only consider chat routes
  if (path === "/api/chat" || path === "/api/chat/stream") {
    const mode = (req.headers.get("x-medx-mode") || "").toLowerCase();

    const isBasic = mode === "basic" || mode === "casual";
    if (!isBasic) {
      // rewrite to final-say versions
      if (path === "/api/chat") {
        url.pathname = "/api/chat/final";
      } else {
        url.pathname = "/api/chat/stream-final";
      }
      return NextResponse.rewrite(url);
    }
  }

  // Triage paths: if you already post to /api/triage, you can similarly force:
  if (path === "/api/triage") {
    const mode = (req.headers.get("x-medx-mode") || "").toLowerCase();
    const isBasic = mode === "basic" || mode === "casual";
    if (!isBasic) {
      url.pathname = "/api/triage-final";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

// Limit to API routes for safety
export const config = {
  matcher: ["/api/chat", "/api/chat/stream", "/api/triage"],
};
