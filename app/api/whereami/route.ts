import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.ip ||
      '';
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { cache: 'no-store' });
    const j = await r.json();
    return NextResponse.json({
      country_code: j?.country_code || null,
      country_name: j?.country_name || null,
      lat: j?.latitude ?? null,
      lon: j?.longitude ?? null,
    });
  } catch (e) {
    return NextResponse.json({ country_code: null, country_name: null }, { status: 200 });
  }
}
