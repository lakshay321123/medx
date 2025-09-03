import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as Session | null;
  const userId = session?.user?.id;
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('threadId');
  if (!threadId) return new NextResponse('Missing threadId', { status: 400 });

  const data = await prisma.prediction.findMany({
    where: { threadId, thread: { userId } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, createdAt: true, riskScore: true, band: true },
  });

  return NextResponse.json(data);
}
