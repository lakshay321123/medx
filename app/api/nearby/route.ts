import { NextRequest, NextResponse } from 'next/server';
import { haversineKm, osmAmenityFor } from '@/addons/nearby/lib/geo';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  if (process.env.FEATURE_NEARBY !== 'on')
    return NextResponse.json({ disabled: true, reason: 'FEATURE_NEARBY is off' }, { status: 200 });

  try {
    const { lat, lng, kind, radiusMeters = 5000, limit = 20 } = await req.json();
    if (typeof lat !== 'number' || typeof lng !== 'number')
      return NextResponse.json({ error: 'Missing coords' }, { status: 400 });

    const amenities = osmAmenityFor(String(kind||'')), around = Math.min(Math.max(500, +radiusMeters||5000), 20000);
    const parts = amenities.map(a=>`
      node["amenity"="${a}"](around:${around},${lat},${lng});
      way["amenity"="${a}"](around:${around},${lat},${lng});
      relation["amenity"="${a}"](around:${around},${lat},${lng});
    `).join('\n');

    const query = `[out:json][timeout:25];(${parts});out center ${limit};`;
    const ua = process.env.OVERPASS_USER_AGENT || 'MedX/1.0';
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': ua },
      body: new URLSearchParams({ data: query })
    });
    if (!resp.ok) return NextResponse.json({ error: `Overpass ${resp.status}`, detail: await resp.text() }, { status: 502 });

    const json = await resp.json();
    const here = { lat, lng };
    const results = (json?.elements||[]).map((el:any)=>{
      const c = el.center ? { lat: el.center.lat, lng: el.center.lon } : { lat: el.lat, lng: el.lon };
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || (tags.amenity || 'Unknown');
      const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']||tags['addr:town']||tags['addr:suburb'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ');
      return {
        id: `${el.type}/${el.id}`, name, address, kind: tags.amenity, coords: c,
        distanceKm: haversineKm(here, c),
        mapsUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        navUrl: `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
      };
    }).filter((r:any)=>Number.isFinite(r.distanceKm)).sort((a:any,b:any)=>a.distanceKm-b.distanceKm).slice(0, limit);

    return NextResponse.json({ results, center: here, radiusMeters: around, source: 'OpenStreetMap Overpass' });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
