import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const id = params.id;
  await prisma.alert.update({
    where: { id, userId },
    data: { status: 'ack' },
  });

  return NextResponse.json({ ok: true });
}
