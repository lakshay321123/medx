import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readSessionCookie } from '@/lib/auth/local-session';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const token = await readSessionCookie();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });
  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  });
  const userId = session?.userId;
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const id = params.id;
  await prisma.alert.update({
    where: { id, userId },
    data: { status: 'ack' },
  });

  return NextResponse.json({ ok: true });
}
