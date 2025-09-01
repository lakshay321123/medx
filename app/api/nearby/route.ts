import { NextRequest, NextResponse } from 'next/server';
import { buildPOIQuery, overpassQuery, haversineKm, normalizeKind, NearbyKind } from '@/lib/geo';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true, ping: 'nearby-alive' });
}

function fallbackKinds(primary: NearbyKind): NearbyKind[] {
  switch (primary) {
    case 'doctor':   return ['doctor','clinic','hospital'];
    case 'clinic':   return ['clinic','doctor','hospital'];
    case 'pharmacy': return ['pharmacy','clinic','hospital'];
    case 'hospital': return ['hospital','clinic','doctor'];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const radius = Number(body.radius ?? 2000);
    const q: string | undefined = body.q;          // free-text like "docs near me"
    const kindIn: string | undefined = body.kind;  // explicit kind if provided

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ ok:false, error:'Missing lat/lon' }, { status: 400 });
    }

    // Normalize requested kind
    let primary: NearbyKind | null = normalizeKind(kindIn || q || '');
    if (!primary) primary = 'doctor'; // sensible default for "docs"
    const kindOrder = fallbackKinds(primary);

    // Try increasing radii and kind fallbacks
    const radii = [radius, Math.max(radius * 2, 4000), Math.max(radius * 4, 8000)];
    let elements: any[] = [];

    outer: for (const k of kindOrder) {
      for (const r of radii) {
        const query = buildPOIQuery(k, lat, lon, r);
        try {
          const json = await overpassQuery(query);
          const list = Array.isArray(json?.elements) ? json.elements : [];
          if (list.length) { elements = list; break outer; }
        } catch {/* try next radius/mirror/kind */}
      }
    }

    const items = elements.map((el: any) => {
      const center = el.center || el;
      const pos = { lat: center.lat, lon: center.lon };
      const distKm = haversineKm({ lat, lon }, pos);
      return {
        id: el.id,
        type: el.type,
        name: el.tags?.name || el.tags?.['name:en'] || '(Unnamed)',
        tags: el.tags || {},
        lat: pos.lat,
        lon: pos.lon,
        distanceKm: Number(distKm.toFixed(2)),
      };
    }).sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      ok: true,
      count: items.length,
      normalizedKind: primary,
      items
    });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: String(e?.message || e) }, { status: 500 });
  }
}

