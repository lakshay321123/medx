import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/api/login/pro", "/api/register", "/api/guest-login", "/api/me", "/api/health", "/api/diag", "/_next", "/assets", "/favicon.ico"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasCookie = req.cookies.get("medx_sid");
  if (!hasCookie) {
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!.*\\.).*)"] };
