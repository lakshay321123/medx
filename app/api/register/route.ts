export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const body = await req.json();
  const name = (body?.name || '').trim();
  const email = (body?.email || '').toLowerCase().trim();
  const password = String(body?.password || '');

  if (!name || !email || password.length < 8) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: 'Email in use' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'USER', guest: false },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
