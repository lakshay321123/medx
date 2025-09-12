import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // Let docs analyzer bypass rewrites
  const feature = (req.headers.get("x-medx-feature") || "").toLowerCase();
  if (feature === "docs" || path.startsWith("/api/docs")) return NextResponse.next();

  const defaultOpenAI = (process.env.OPENAI_REWRITE_DEFAULT || "true").toLowerCase() === "true";
  const modeNorm = (req.headers.get("x-medx-mode") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const isBasic = modeNorm === "basic" || modeNorm === "casual";
  const isFinalMode = ["doctor","doctormode","clinician","research","docai","aidoc","aidocmode","docmode","patient","patientmode"].includes(modeNorm);
  const shouldRewrite = defaultOpenAI ? !isBasic : isFinalMode;

  if (path === "/api/chat" || path === "/api/chat/stream") {
    if (shouldRewrite) {
      url.pathname = path === "/api/chat" ? "/api/chat/final" : "/api/chat/stream-final";
      return NextResponse.rewrite(url);
    }
  }
  if (path === "/api/triage" && shouldRewrite) {
    url.pathname = "/api/triage-final";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
