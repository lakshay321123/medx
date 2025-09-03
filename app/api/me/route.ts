export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "medx_sid";
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");

export async function GET() {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return NextResponse.json({ user: null });

  try {
    const { payload } = await jwtVerify(raw, JWT_SECRET);
    const token = (payload as any)?.t as string | undefined;
    if (!token) return NextResponse.json({ user: null });

    const session = await prisma.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      select: { user: { select: { id: true, name: true, email: true, username: true, role: true } } },
    });
    return NextResponse.json({ user: session?.user ?? null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
