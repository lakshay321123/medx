import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC = [
  '/api/auth',
  '/api/health',
  '/api/diag',
  '/favicon.ico',
  '/_next',
  '/assets',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasSession =
    req.cookies.has('next-auth.session-token') ||
    req.cookies.has('__Secure-next-auth.session-token');

  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.searchParams.set('showSignup', '1');
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next|assets|.*\\..*).*)'],
};
