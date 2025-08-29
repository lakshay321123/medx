import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';

/**
 * Returns { lat, lng, source } using client IP (via ipapi.co).
 * Guarded by FEATURE_IP_LOCATE (default: on).
 */
export async function GET(_req: NextRequest) {
  if ((process.env.FEATURE_IP_LOCATE || 'on') !== 'on') {
    return NextResponse.json({ error: 'disabled' }, { status: 200 });
  }
  try {
    // ipapi.co uses caller IP automatically
    const r = await fetch('https://ipapi.co/json/');
    const j = await r.json();
    const lat = Number(j.latitude), lng = Number(j.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('No coords');
    return NextResponse.json({ lat, lng, city: j.city, region: j.region, country: j.country_name, source: 'ipapi' });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
