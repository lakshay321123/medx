// app/api/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { safeJson } from '@/lib/safeJson';

export const runtime = 'nodejs';

type Item = {
  id: number;
  title: string;
  subtitle?: string;
  address?: string;
  phone?: string;
  website?: string;
  mapsUrl: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLon = (bLon - aLon) * Math.PI / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * Math.PI / 180) *
      Math.cos(bLat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

function pickName(tags: any) {
  return tags?.name || tags?.['alt_name'] || tags?.['official_name'] || '';
}

function pickAddress(tags: any) {
  const parts = [
    tags?.['addr:housenumber'],
    tags?.['addr:street'],
    tags?.['addr:city'],
    tags?.['addr:state'],
    tags?.['addr:postcode'],
    tags?.['addr:country'],
  ].filter(Boolean);
  return parts.join(', ');
}

function cleanPhone(p?: string) {
  if (!p) return undefined;
  return String(p).replace(/;/g, ', ').trim();
}

function mapsUrl(lat: number, lon: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = (searchParams.get('kind') || 'doctor').toLowerCase(); // 'doctor' | 'pharmacy'
    const lat = Number(searchParams.get('lat'));
    const lon = Number(searchParams.get('lon'));
    const q = (searchParams.get('q') || '').trim(); // optional name filter
    const radius = Math.min(Number(searchParams.get('radius') || 5000), 20000); // meters
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ ok: false, error: 'lat/lon required' }, { status: 400 });
    }

    let filters = '';
    if (kind === 'pharmacy') {
      filters = '(node["amenity"="pharmacy"];way["amenity"="pharmacy"];relation["amenity"="pharmacy"];);';
    } else {
      filters = '('
        + 'node["amenity"="doctors"];way["amenity"="doctors"];relation["amenity"="doctors"];'
        + 'node["amenity"="clinic"];way["amenity"="clinic"];relation["amenity"="clinic"];'
        + 'node["amenity"="hospital"];way["amenity"="hospital"];relation["amenity"="hospital"];'
        + ');';
    }

    const overpassQL =
`[out:json][timeout:25];
(
  ${filters}
)(around:${radius},${lat},${lon});
out center ${limit};
`;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ data: overpassQL }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `Overpass error ${res.status}`, detail: text.slice(0, 2000) }, { status: 502 });
    }

    const json = await safeJson(res) as any;
    const elements = json?.elements || [];

    const items: Item[] = [];
    for (const el of elements) {
      const tags = el.tags || {};
      const name = pickName(tags);
      const center = el.center || el;
      const eLat = center.lat, eLon = center.lon;
      if (!Number.isFinite(eLat) || !Number.isFinite(eLon)) continue;
      if (q && name && !name.toLowerCase().includes(q.toLowerCase())) continue;

      items.push({
        id: el.id,
        title: name || (kind === 'pharmacy' ? 'Pharmacy' : (tags['amenity'] || 'Clinic')),
        subtitle: tags['operator'] || tags['brand'] || undefined,
        address: pickAddress(tags) || undefined,
        phone: cleanPhone(tags['phone'] || tags['contact:phone']),
        website: tags['website'] || tags['contact:website'] || undefined,
        mapsUrl: mapsUrl(eLat, eLon),
        lat: eLat,
        lon: eLon,
        distanceKm: Math.round(haversineKm(lat, lon, eLat, eLon) * 10) / 10,
      });
    }

    items.sort((a, b) => a.distanceKm - b.distanceKm);
    return NextResponse.json({ ok: true, items: items.slice(0, limit) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
