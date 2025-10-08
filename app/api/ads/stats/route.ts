import { NextResponse } from 'next/server';
import { getRevenueStats } from '@/lib/ads/metrics';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  const ok = await requireAdmin(req);
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getRevenueStats();
  return NextResponse.json(data, { status: 200 });
}
