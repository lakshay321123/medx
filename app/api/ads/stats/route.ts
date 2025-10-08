import { NextResponse } from 'next/server';
import { getRevenueStats } from '@/lib/ads/revenue';

export async function GET() {
  const stats = getRevenueStats();
  return NextResponse.json(stats, { status: 200 });
}
