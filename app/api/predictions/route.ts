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
  const threadId = searchParams.get('threadId');
  if (!threadId) return new NextResponse('Missing threadId', { status: 400 });

  const data = await prisma.prediction.findMany({
    where: { threadId, thread: { userId: user.id } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, createdAt: true, riskScore: true, band: true },
  });

  return NextResponse.json(data);
}
