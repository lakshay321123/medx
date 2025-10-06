import { NextResponse } from 'next/server';
import { broker } from '@/lib/ads/broker';
import { AdContext } from '@/types/ads';

export async function POST(req: Request) {
  const body = await req.json().catch(()=> ({}));
  const ctx: AdContext = {
    text: String(body.text ?? '').slice(0, 500),
    region: String(body.region ?? process.env.ADS_REGION_DEFAULT ?? 'IN-DL'),
    tier: (body.tier ?? 'free'),
    zone: (body.zone ?? 'chat'),
  };
  const result = await broker(ctx);
  return NextResponse.json(result, { status: 200 });
}
