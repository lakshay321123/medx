export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSessionCookie } from "@/lib/auth/local-session";

export async function GET() {
  const token = await readSessionCookie();
  if (!token) return NextResponse.json({ user: null }, { status: 200 });

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { user: { select: { id: true, name: true, email: true, username: true, role: true } } },
  });

  return NextResponse.json({ user: session?.user ?? null });
}
