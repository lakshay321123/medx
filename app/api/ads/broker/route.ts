import { NextResponse } from 'next/server';
import type { AdContext } from '@/types/ads';
import { broker } from '@/lib/ads/broker';

// If you’re using the cookie-based frequency gate, keep this import.
// import { cookies } from 'next/headers';

const VALID_TIERS = ['free', '100', '200', '500'] as const;
const VALID_ZONES = ['chat', 'reports', 'aidoc', 'directory'] as const;
type Tier = (typeof VALID_TIERS)[number];
type Zone = (typeof VALID_ZONES)[number];

function sanitizeText(x: unknown): string {
  const s = String(x ?? '').trim();
  // hard clamp to protect broker & logs
  return s.slice(0, 500);
}

function normalizeRegion(x: unknown): string {
  const d = process.env.ADS_REGION_DEFAULT || 'IN-DL';
  const s = String(x ?? d).trim().toUpperCase();
  // very light sanity: allow A-Z, dash
  return /^[A-Z-]{2,10}$/.test(s) ? s : d.toUpperCase();
}

export async function POST(req: Request) {
  // (Optional) Content-Type check to help client bugs
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }

  // explicit JSON parse handling
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // validate tier/zone with safe fallbacks
  const tierRaw = String(body.tier ?? 'free');
  const tier: Tier = (VALID_TIERS as readonly string[]).includes(tierRaw) ? (tierRaw as Tier) : 'free';

  const zoneRaw = String(body.zone ?? 'chat');
  const zone: Zone = (VALID_ZONES as readonly string[]).includes(zoneRaw) ? (zoneRaw as Zone) : 'chat';

  // build context
  const ctx: AdContext = {
    text: sanitizeText(body.text),
    region: normalizeRegion(body.region),
    tier,
    zone,
  };

  // If you use cookie-based frequency gating, bump counters here (server-side).
  // const state = readCookieOrInit(); // your helper
  // state.promptsSinceLast += 1;
  // if (!shouldShowAd(state.promptsSinceLast, tier) || state.totalShown >= sessionCap) {
  //   writeCookie(state);
  //   return NextResponse.json({ reason: 'freq_wait' }, { status: 200 });
  // }

  const result = await broker(ctx);

  // If ad shown, reset counter / increment totals:
  // if (result.card) { state.promptsSinceLast = 0; state.totalShown += 1; }
  // writeCookie(state);

  return NextResponse.json(result, { status: 200 });
}
