export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearSessionCookie } from "@/lib/auth/local-session";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const COOKIE = "medx_sid";
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");

export async function POST() {
  const raw = cookies().get(COOKIE)?.value;
  if (raw) {
    try {
      const { payload } = await jwtVerify(raw, SECRET);
      const token = (payload as any)?.t as string | undefined;
      if (token) {
        await prisma.session.deleteMany({ where: { token } });
      }
    } catch {
      // ignore
    }
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
