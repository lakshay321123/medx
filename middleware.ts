import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Smart routing: Groq streaming for wellness/therapy (fast), OpenAI for clinical/aidoc (accurate).
// The /api/chat/stream route handles its own provider selection internally.
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  if (path === "/api/chat" || path === "/api/chat/stream") {
    const raw = (url.searchParams.get("modeTag") || url.searchParams.get("mode") || "").toLowerCase().trim();
    
    // Normalize mode aliases
    const modeMap: Record<string, string> = {
      doctor: "clinical",
      clinician: "clinical",
      clinical: "clinical",
      clinical_research: "clinical_research",
      aidoc: "aidoc",
      ai_doc: "aidoc",
    };
    const normalized = modeMap[raw] || raw;
    
    // Only redirect to OpenAI for modes that need maximum accuracy
    const needsOpenAI = normalized === "clinical" || normalized === "clinical_research" || normalized === "aidoc";
    
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
