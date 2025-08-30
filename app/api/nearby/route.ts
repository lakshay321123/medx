// app/api/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';

const UA = process.env.NOMINATIM_USER_AGENT || 'MedX/1.0 (contact: ops@medx.ai)';

type LatLon = { lat: number; lon: number };

async function ipLookup(req: NextRequest): Promise<LatLon | null> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      // Vercel edge might not expose req.ip; that’s ok.
      undefined;
    // Free, no API key: fallback accuracy is city-ish
    const r = await fetch(`https://ipapi.co/${ip || ''}/json/`, { cache: 'no-store' });
    const j = await r.json();
    if (j?.latitude && j?.longitude) return { lat: j.latitude, lon: j.longitude };
  } catch {}
  return null;
}

function overpassQuery(lat: number, lon: number, radius = 3000) {
  // amenity=doctors, clinic, hospital, pharmacy
  return `
[out:json][timeout:25];
(
  node["amenity"~"doctors|clinic|hospital|pharmacy"](around:${radius},${lat},${lon});
  way["amenity"~"doctors|clinic|hospital|pharmacy"](around:${radius},${lat},${lon});
  relation["amenity"~"doctors|clinic|hospital|pharmacy"](around:${radius},${lat},${lon});
);
out center 20;
`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lon = parseFloat(searchParams.get('lon') || '');
    const radius = Math.min(parseInt(searchParams.get('radius') || '3000', 10), 20000);

    let coords: LatLon | null =
      Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : await ipLookup(req);

    if (!coords) {
      return NextResponse.json(
        { error: 'location_unavailable', hint: 'Call Set location, then try again.' },
        { status: 400 }
      );
    }

    const q = overpassQuery(coords.lat, coords.lon, radius);
    // Respect Overpass with POST + UA, gentler than GET
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': UA,
      },
      body: new URLSearchParams({ data: q }),
      // Don’t cache: places can change
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'overpass_error', status: res.status, text }, { status: 502 });
    }

    const json = await res.json();
    // Normalize nodes/ways/relations to simple cards
    const items =
      (json?.elements || []).map((el: any) => {
        const center = el.type === 'node' ? { lat: el.lat, lon: el.lon } : el.center;
        const tags = el.tags || {};
        return {
          id: `${el.type}/${el.id}`,
          name: tags.name || tags['operator'] || 'Unknown',
          type: tags.amenity || 'facility',
          phone: tags.phone || tags['contact:phone'] || null,
          website: tags.website || tags['contact:website'] || null,
          address: [
            tags['addr:housenumber'],
            tags['addr:street'],
            tags['addr:city'],
            tags['addr:state'],
          ]
            .filter(Boolean)
            .join(', '),
          lat: center?.lat,
          lon: center?.lon,
        };
      }) ?? [];

    return NextResponse.json({ coords, items });
  } catch (e: any) {
    return NextResponse.json({ error: 'nearby_unhandled', message: e?.message }, { status: 500 });
  }
}
