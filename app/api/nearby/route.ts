import { NextRequest, NextResponse } from 'next/server';

const UA =
  process.env.NOMINATIM_USER_AGENT ||
  'MedX/1.0 (contact: ops@medx.ai)';

type LatLon = { lat: number; lon: number };

async function ipLookup(req: NextRequest): Promise<LatLon | null> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const r = await fetch(`https://ipapi.co/${ip || ''}/json/`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (j?.latitude && j?.longitude) return { lat: j.latitude, lon: j.longitude };
  } catch (e) {
    console.error('ipLookup error', e);
  }
  return null;
}

function overpassQuery(lat: number, lon: number, radius = 3000, kinds?: string) {
  const amenity = kinds && kinds !== 'any'
    ? kinds
    : 'doctors|clinic|hospital|pharmacy';
  return `
[out:json][timeout:25];
(
  node["amenity"~"${amenity}"](around:${radius},${lat},${lon});
  way["amenity"~"${amenity}"](around:${radius},${lat},${lon});
  relation["amenity"~"${amenity}"](around:${radius},${lat},${lon});
);
out center 30;
`;
}

async function callOverpass(query: string) {
  const body = new URLSearchParams({ data: query });
  const common: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': UA,
    },
    body,
    cache: 'no-store',
  };

  // Primary
  let res = await fetch('https://overpass-api.de/api/interpreter', common);
  if (res.status === 429 || res.status >= 500) {
    console.warn('Primary Overpass rate/err', res.status);
    // Fallback mirror
    res = await fetch('https://overpass.kumi.systems/api/interpreter', common);
  }
  return res;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lon = parseFloat(searchParams.get('lon') || '');
    const kinds = searchParams.get('kind') || 'any';
    const radius = Math.min(parseInt(searchParams.get('radius') || '3000', 10), 20000);

    let coords: LatLon | null =
      Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : await ipLookup(req);

    if (!coords) {
      console.warn('No coords resolved (GPS+IP failed)');
      return NextResponse.json(
        { error: 'location_unavailable', hint: 'Allow location or use Set location.' },
        { status: 400 }
      );
    }

    const q = overpassQuery(coords.lat, coords.lon, radius, kinds);
    const res = await callOverpass(q);

    const text = await res.text(); // log raw in case JSON fails
    if (!res.ok) {
      console.error('Overpass not ok', res.status, text.slice(0, 500));
      return NextResponse.json({ error: 'overpass_error', status: res.status }, { status: 502 });
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Overpass JSON parse failed; got:', text.slice(0, 500));
      return NextResponse.json({ error: 'overpass_bad_json' }, { status: 502 });
    }

    const items =
      (data?.elements || []).map((el: any) => {
        const center = el.type === 'node' ? { lat: el.lat, lon: el.lon } : el.center;
        const tags = el.tags || {};
        return {
          id: `${el.type}/${el.id}`,
          name: tags.name || tags.operator || 'Unknown',
          type: tags.amenity || 'facility',
          phone: tags.phone || tags['contact:phone'] || null,
          website: tags.website || tags['contact:website'] || null,
          address: [
            tags['addr:housenumber'],
            tags['addr:street'],
            tags['addr:city'],
            tags['addr:state'],
          ].filter(Boolean).join(', '),
          lat: center?.lat,
          lon: center?.lon,
        };
      }) ?? [];

    console.log('Nearby items', items.length);
    return NextResponse.json({ coords, items });
  } catch (e: any) {
    console.error('nearby_unhandled', e?.message);
    return NextResponse.json({ error: 'nearby_unhandled', message: e?.message }, { status: 500 });
  }
}
