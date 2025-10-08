import { NextResponse } from 'next/server';
import { recordPartnerEvent } from '@/lib/ads/revenue';

type Event = {
  type: 'impression' | 'click';
  partner?: string;
  cat?: 'labs' | 'otc' | 'clinic';
  messageId?: string;
  zone?: 'chat' | 'reports' | 'aidoc' | 'directory';
  tier?: 'free' | '100' | '200' | '500';
};

const RATE = Number(process.env.ADS_TRACK_SAMPLE ?? '1');

export async function POST(req: Request) {
  if (!(req.headers.get('content-type') || '').includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }

  let body: Event;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.type || !['impression', 'click'].includes(body.type)) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  }

  recordPartnerEvent(body.partner || 'unknown', body.type);

  if (Math.random() < RATE) {
    console.log('[ads.track]', {
      t: body.type,
      p: body.partner,
      c: body.cat,
      m: body.messageId,
      z: body.zone,
      tier: body.tier,
      at: Date.now(),
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
