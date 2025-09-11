import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import guides from '@/data/device_guides.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const device = searchParams.get('device') || '';
  const guide: any = (guides as any)[device];
  if (!guide) return NextResponse.json({ steps: [], images: [] }, { status: 404 });
  return NextResponse.json(guide);
}
