export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearSessionCookie, readSessionCookie } from "@/lib/auth/local-session";

export async function POST() {
  const token = await readSessionCookie();
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
