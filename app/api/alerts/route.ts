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
  const status = searchParams.get('status') || undefined;

  const alerts = await prisma.alert.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(alerts);
}
