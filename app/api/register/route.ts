export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

function validateEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function validateUsername(u: string) {
  return /^[a-zA-Z0-9_.]{3,20}$/.test(u);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawName = String(body?.name ?? "").trim();
    const rawEmail = String(body?.email ?? "").toLowerCase().trim();
    const rawUsername = String(body?.username ?? "").toLowerCase().trim();
    const rawPassword = String(body?.password ?? "");

    if (!rawName || !rawEmail || !rawUsername || !rawPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (!validateEmail(rawEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (!validateUsername(rawUsername)) {
      return NextResponse.json({ error: "Username must be 3–20 chars: letters, numbers, _ or ." }, { status: 400 });
    }
    if (rawPassword.length < 8) {
      return NextResponse.json({ error: "Password too short (min 8 chars)." }, { status: 400 });
    }

    const dup = await prisma.user.findFirst({
      where: { OR: [{ email: rawEmail }, { username: rawUsername }] },
      select: { email: true, username: true },
    });
    if (dup) {
      const which = dup.email === rawEmail ? "email" : "username";
      return NextResponse.json({ error: `That ${which} is already in use.` }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const created = await prisma.user.create({
      data: {
        name: rawName,
        email: rawEmail,
        username: rawUsername,
        passwordHash,
        role: "USER",
      },
      select: { id: true, name: true, email: true, username: true },
    });

    return NextResponse.json({ ok: true, user: created }, { status: 201 });
  } catch (err) {
    console.error("REGISTER_ERROR:", err);
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}
