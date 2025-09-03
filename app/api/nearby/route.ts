import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { lat, lng, type = 'pharmacy', radiusKm = 5, countryCode2 } = await req.json();
    const overpass = 'https://overpass-api.de/api/interpreter';

    let query: string;
    if (lat != null && lng != null) {
      query = `
[out:json];
(
  node[amenity="${type}"](around:${radiusKm * 1000},${lat},${lng});
  way[amenity="${type}"](around:${radiusKm * 1000},${lat},${lng});
  relation[amenity="${type}"](around:${radiusKm * 1000},${lat},${lng});
);
out center tags;`;
    } else if (countryCode2) {
      query = `
[out:json];
area["ISO3166-1"="${countryCode2}"][admin_level=2]->.searchArea;
(
  node[amenity="${type}"](area.searchArea);
  way[amenity="${type}"](area.searchArea);
  relation[amenity="${type}"](area.searchArea);
);
out center tags;`;
    } else {
      return NextResponse.json({ error: 'lat/lng or countryCode2 required' }, { status: 400 });
    }

    const res = await fetch(overpass, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
    });
    const data = await res.json();
    const results = (data.elements || []).map((el: any) => ({
      id: el.id,
      lat: el.lat || el.center?.lat,
      lng: el.lon || el.center?.lon,
      name: el.tags?.name || '',
      tags: el.tags || {},
    }));
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'nearby failed' }, { status: 500 });
  }
}
