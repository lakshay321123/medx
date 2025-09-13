import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/getUserId';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json([]);
  const threads = await prisma.chatThread.findMany({
    where: { userId, type: 'aidoc' },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  });
  return NextResponse.json(threads);
}
