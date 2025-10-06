// app/api/ads/broker/route.ts
import { NextResponse } from 'next/server';
import type { AdContext } from '@/types/ads';
import { broker } from '@/lib/ads/broker';

const VALID_TIERS = ['free', '100', '200', '500'] as const;
const VALID_ZONES = ['chat', 'reports', 'aidoc', 'directory'] as const;
type Tier = typeof VALID_TIERS[number];
type Zone = typeof VALID_ZONES[number];

function sanitizeText(x: unknown): string {
  const s = String(x ?? '').trim();
  return s.slice(0, 500);
}
function normalizeRegion(x: unknown): string {
  const def = (process.env.ADS_REGION_DEFAULT || 'IN-DL').toUpperCase();
  const val = String(x ?? def).trim().toUpperCase();
  return /^[A-Z-]{2,10}$/.test(val) ? val : def;
}

export async function POST(req: Request) {
  // Helpful content-type guard (prevents confusing errors)
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  // Explicit JSON parse with 400 on failure
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate tier/zone (fallbacks to safe defaults)
  const tierRaw = String(body.tier ?? 'free');
  const tier: Tier = (VALID_TIERS as readonly string[]).includes(tierRaw) ? (tierRaw as Tier) : 'free';

  const zoneRaw = String(body.zone ?? 'chat');
  const zone: Zone = (VALID_ZONES as readonly string[]).includes(zoneRaw) ? (zoneRaw as Zone) : 'chat';

  const ctx: AdContext = {
    text: sanitizeText(body.text),
    region: normalizeRegion(body.region),
    tier,
    zone,
  };

  const result = await broker(ctx);
  return NextResponse.json(result, { status: 200 });
}
