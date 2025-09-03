import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readSessionCookie } from '@/lib/auth/local-session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = await readSessionCookie();
  if (!token) return new NextResponse('Unauthorized', { status: 401 });
  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  });
  const userId = session?.userId;
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const observations = await prisma.observation.findMany({
    where: { userId },
    orderBy: { observedAt: 'desc' },
    take: Math.min(limit, 1000),
    select: { kind: true, value: true, observedAt: true },
  });

  return NextResponse.json(observations);
}
