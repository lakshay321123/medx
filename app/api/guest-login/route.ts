export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { setSessionCookie, expiry } from "@/lib/auth/local-session";

export async function POST() {
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = expiry(1);
    await prisma.session.create({ data: { userId: "guest", token, expiresAt } });
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("GUEST_LOGIN_ERROR:", err);
    return NextResponse.json({ error: "Guest login failed." }, { status: 500 });
  }
}
