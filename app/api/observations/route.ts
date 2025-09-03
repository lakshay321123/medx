import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/local-session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === 'GUEST') {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const observations = await prisma.observation.findMany({
    where: { userId: user.id },
    orderBy: { observedAt: 'desc' },
    take: Math.min(limit, 1000),
    select: { kind: true, value: true, observedAt: true },
  });

  return NextResponse.json(observations);
}
