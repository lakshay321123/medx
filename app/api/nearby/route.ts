import { NextRequest, NextResponse } from 'next/server';
import { buildPOIQuery, overpassQuery, haversineKm } from '@/lib/geo';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true, ping: 'nearby-alive' });
}

export async function POST(req: NextRequest) {
  try {
    const { lat, lon, kind = 'hospital', radius = 2000 } = await req.json();
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json({ ok:false, error:'Missing lat/lon' }, { status: 400 });
    }

    // Try increasing radii until we find something
    const radii = [radius, Math.max(radius * 2, 4000), Math.max(radius * 4, 8000)];
    let elements: any[] = [];
    for (const r of radii) {
      const q = buildPOIQuery(kind, lat, lon, r);
      try {
        const json = await overpassQuery(q);
        elements = Array.isArray(json?.elements) ? json.elements : [];
        if (elements.length) break;
      } catch { /* try next radius/mirror */ }
    }

    // Normalize + sort by distance
    const items = elements.map((el: any) => {
      const center = el.center || el; // node has lat/lon, way/relation has center
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
    }).sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ ok:true, count: items.length, items });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: String(e?.message || e) }, { status: 500 });
  }
}
