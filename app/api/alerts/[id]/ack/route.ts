import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/local-session';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || user.role === 'GUEST') {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }
  const id = params.id;
  await prisma.alert.update({
    where: { id, userId: user.id },
    data: { status: 'ack' },
  });
  return NextResponse.json({ ok: true });
}
