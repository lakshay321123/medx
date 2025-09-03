export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, consentFlags: true, role: true, guest: true },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const consentFlags = body?.consentFlags;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { consentFlags },
    select: { id: true, name: true, email: true, consentFlags: true },
  });

  return NextResponse.json({ user });
}
