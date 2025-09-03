export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

function validateEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function validateUsername(u: string) {
  return /^[a-zA-Z0-9_\.]{3,20}$/.test(u);
}

export async function POST(req: Request) {
  const { name, email, username, password } = await req.json();

  if (!name || !email || !username || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!validateEmail(email)) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  if (!validateUsername(username)) return NextResponse.json({ error: "Invalid username." }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ error: "Password too short (min 8)." }, { status: 400 });

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
  });
  if (existing) return NextResponse.json({ error: "Email or username already in use." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
      role: "USER",
    },
    select: { id: true, name: true, email: true, username: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
