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
