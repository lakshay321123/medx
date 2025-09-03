import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(alerts);
}
