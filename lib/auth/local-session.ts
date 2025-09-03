import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE = "medx_sid";
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");

export function expiry(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jwt = await new SignJWT({ t: token })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(SECRET);

  cookies().set(COOKIE, jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionUser() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, SECRET);
    const token = (payload as any)?.t as string | undefined;
    if (!token) return null;
    const session = await prisma.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!session) return null;

    if (session.userId === "guest" || !session.user) {
      return { id: "guest", name: "Guest", email: "", username: "", role: "GUEST" as const };
    }
    const { id, name, email, username, role } = session.user;
    return { id, name, email, username, role };
  } catch {
    return null;
  }
}
