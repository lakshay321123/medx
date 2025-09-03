import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const observations = await prisma.observation.findMany({
    where: { userId: session.user.id },
    orderBy: { observedAt: 'desc' },
    take: Math.min(limit, 1000),
    select: { kind: true, value: true, observedAt: true },
  });

  return NextResponse.json(observations);
}
