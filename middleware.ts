import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Smart routing: fast Groq for wellness/therapy, accurate OpenAI for clinical/aidoc
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  if (path === "/api/chat" || path === "/api/chat/stream") {
    // Read mode from query param (ChatPane sends ?mode=X&modeTag=Y)
    const modeTag = (url.searchParams.get("modeTag") || url.searchParams.get("mode") || "").toLowerCase();
    
    // Only redirect to OpenAI for modes that need maximum accuracy
    const needsOpenAI = modeTag === "clinical" || modeTag === "clinical_research" || modeTag === "aidoc";
    
    if (needsOpenAI) {
      url.pathname = path === "/api/chat" ? "/api/chat/final" : "/api/chat/stream-final";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/chat", "/api/chat/stream", "/api/triage-final"],
};
