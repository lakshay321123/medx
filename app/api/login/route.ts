export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { setSessionCookie, sessionExpiryDate } from "@/lib/auth/local-session";

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
    }

    const id = String(identifier).toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: id }, { username: id }] },
    });
    if (!user) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = sessionExpiryDate();

    await prisma.session.create({ data: { userId: user.id, token, expiresAt } });
    await setSessionCookie(token, expiresAt);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}
