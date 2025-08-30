import { NextRequest, NextResponse } from 'next/server';
import { haversineKm, osmAmenityFor } from '../../../addons/nearby/lib/geo';

export const runtime = 'edge';

async function fetchOverpass(query: string, ua: string) {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter'
  ];
  let lastText = '';
  for (const url of endpoints) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': ua },
      body: new URLSearchParams({ data: query })
    });
    const ctype = resp.headers.get('content-type') || '';
    const text = await resp.text();
    if (!resp.ok) { lastText = text; continue; }
    // Reject HTML error pages
    if (ctype.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try { return JSON.parse(text); } catch { /* fall through */ }
    }
    lastText = text;
  }
  throw new Error(`Overpass returned non-JSON/HTML error. Last body (truncated): ${lastText.slice(0,300)}`);
}

export async function POST(req: NextRequest) {
  try {
    const { query, coords } = await req.json();
    if (!query || !coords?.lat || !coords?.lng) {
      return NextResponse.json({ results: [] });
    }
    const amenities = osmAmenityFor(query);
    if (!amenities.length) return NextResponse.json({ results: [] });

    const radius = 5000; // meters
    const overpass = `
      [out:json];
      (
        node["amenity"~"${amenities.join('|')}"](around:${radius},${coords.lat},${coords.lng});
        way["amenity"~"${amenities.join('|')}"](around:${radius},${coords.lat},${coords.lng});
        relation["amenity"~"${amenities.join('|')}"](around:${radius},${coords.lat},${coords.lng});
      );
      out center;
    `;

    const ua = process.env.OVERPASS_USER_AGENT || 'MedX/1.0';
    const json = await fetchOverpass(overpass, ua);
    const elements = Array.isArray(json.elements) ? json.elements : [];

    const results = elements.map((el:any) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      return {
        id: el.id,
        name: el.tags?.name || 'Unnamed',
        lat,
        lng,
        distanceKm: haversineKm(coords.lat, coords.lng, lat, lng),
        tags: el.tags || {}
      };
    }).sort((a:any,b:any)=>a.distanceKm-b.distanceKm);

    return NextResponse.json({ results });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
