import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "medx_sid";
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");
const SESSION_TTL_DAYS = 30;

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jwt = await new SignJWT({ t: token })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(JWT_SECRET);

  cookies().set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function readSessionCookie(): Promise<string | null> {
  const c = cookies().get(COOKIE_NAME)?.value;
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c, JWT_SECRET);
    return (payload as any)?.t as string;
  } catch {
    return null;
  }
}

export function sessionExpiryDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_TTL_DAYS);
  return d;
}
