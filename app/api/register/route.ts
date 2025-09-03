export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userRx = /^[a-zA-Z0-9_.]{3,20}$/;

export async function POST(req: Request) {
  try {
    const { name, email, username, password } = await req.json();
    if (!name || !email || !username || !password)
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    if (!emailRx.test(String(email)))
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    if (!userRx.test(String(username)))
      return NextResponse.json({ error: "Username must be 3–20 chars: letters, numbers, _ or ." }, { status: 400 });
    if (String(password).length < 8)
      return NextResponse.json({ error: "Password too short (min 8 chars)." }, { status: 400 });

    const passwordHash = await bcrypt.hash(String(password), 12);

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        username: String(username).toLowerCase().trim(),
        passwordHash,
        role: "USER",
      },
      select: { id: true, name: true, email: true, username: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      const t = Array.isArray(err.meta?.target) ? err.meta.target[0] : err.meta?.target;
      const which = String(t).includes("username")
        ? "username"
        : String(t).includes("email")
        ? "email"
        : "email/username";
      return NextResponse.json({ error: `That ${which} is already in use.` }, { status: 409 });
    }
    console.error("REGISTER_ERROR:", err);
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}
