import { NextRequest, NextResponse } from 'next/server';
import { haversineKm, osmAmenityFor } from '@/lib/geo';

export const runtime = 'edge';

type OverpassElement = {
  type: 'node'|'way'|'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat:number; lon:number };
  tags?: Record<string,string>;
};

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, kind, radiusMeters = 5000, limit = 20 } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Missing coords' }, { status: 400 });
    }

    const amenities = osmAmenityFor(String(kind||''));
    const around = Math.min(Math.max(500, Number(radiusMeters)||5000), 20000); // clamp 0.5–20 km

    const parts = amenities.map(a => `
      node["amenity"="${a}"](around:${around},${lat},${lng});
      way["amenity"="${a}"](around:${around},${lat},${lng});
      relation["amenity"="${a}"](around:${around},${lat},${lng});
    `).join('\n');

    const query = `
      [out:json][timeout:25];
      (
        ${parts}
      );
      out center ${limit};
    `.trim();

    const ua = process.env.OVERPASS_USER_AGENT || 'MedX/1.0 (https://example.com)';
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': ua },
      body: new URLSearchParams({ data: query })
    });

    if (!resp.ok) {
      const t = await resp.text().catch(()=> '');
      return NextResponse.json({ error: `Overpass ${resp.status}`, detail: t }, { status: 502 });
    }

    const json = await resp.json();
    const elements: OverpassElement[] = json?.elements || [];

    const here = { lat, lng };
    const results = elements.map(el => {
      const c = el.center ? { lat: el.center.lat, lng: el.center.lon }
                          : { lat: el.lat!,        lng: el.lon! };
      const distKm = haversineKm(here, c);
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || (tags.amenity ? tags.amenity : 'Unknown');
      const address = [
        tags['addr:housenumber'], tags['addr:street'],
        tags['addr:city'] || tags['addr:town'] || tags['addr:suburb'],
        tags['addr:state'], tags['addr:postcode']
      ].filter(Boolean).join(', ');
      const mapsUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
      return { id: `${el.type}/${el.id}`, name, address, kind: tags.amenity, coords: c, distanceKm: distKm, mapsUrl, navUrl };
    })
    .filter(r => Number.isFinite(r.distanceKm))
    .sort((a,b)=> a.distanceKm - b.distanceKm)
    .slice(0, limit);

    return NextResponse.json({ results, source: 'OpenStreetMap Overpass', center: here, radiusMeters: around });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
