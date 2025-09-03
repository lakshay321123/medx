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
  const status = searchParams.get('status') || undefined;

  const alerts = await prisma.alert.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(alerts);
}
