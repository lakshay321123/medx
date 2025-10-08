import { NextResponse } from 'next/server';
import { recordPartnerEvent } from '@/lib/ads/metrics';

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
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
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

  const partner = String(body.partner || 'unknown');
  const zone = String(body.zone || 'unknown');

  recordPartnerEvent(partner, body.type, zone).catch(() => {});

  if (Math.random() < RATE) {
    console.log('[ads.track]', {
      t: body.type,
      p: partner,
      c: body.cat,
      m: body.messageId,
      z: zone,
      tier: body.tier,
      at: Date.now(),
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
