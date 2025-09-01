// app/api/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { haversineKm, osmAmenityFor } from '@/addons/nearby/lib/geo';

export const runtime = 'nodejs';

type Item = {
  id: number | string;
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

function pickName(tags: any) {
  return tags?.name || tags?.['name:en'] || tags?.['alt_name'] || tags?.['official_name'] || '';
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

/** Build Overpass filters with (around:...) on EACH selector — critical! */
function buildFilters(tags: string[], radius: number, lat: number, lon: number) {
  const lines: string[] = [];
  for (const a of tags) {
    lines.push(`node["amenity"="${a}"](around:${radius},${lat},${lon});`);
    lines.push(`way["amenity"="${a}"](around:${radius},${lat},${lon});`);
    lines.push(`relation["amenity"="${a}"](around:${radius},${lat},${lon});`);
  }
  return lines.join('\n');
}

const OVERPASS_MIRRORS = [
  process.env.OVERPASS_URL || '',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
].filter(Boolean);

async function overpassQuery(ql: string) {
  let lastErr: any;
  for (let i = 0; i < Math.min(3, OVERPASS_MIRRORS.length); i++) {
    const url = OVERPASS_MIRRORS[i];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams({ data: ql }),
        cache: 'no-store',
      });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Overpass failed');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get('lat'));
    const lon = Number(searchParams.get('lon'));
    const q = (searchParams.get('q') || '').trim();     // free text e.g. "docs near me"
    const kind = (searchParams.get('kind') || '').trim(); // optional explicit kind
    const radius = Math.min(Number(searchParams.get('radius') || 5000), 20000);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ ok: false, error: 'lat/lon required' }, { status: 400 });
    }

    // Decide amenity tags to try
    const tags = kind
      ? [kind] // if you pass kind=pharmacy/clinic/doctors/hospital explicitly
      : osmAmenityFor(q || 'doctor');

    // Widen the search if needed
    const radii = [radius, Math.max(radius * 2, 8000), Math.max(radius * 4, 16000), 20000];

    let elements: any[] = [];
    for (const r of radii) {
      const filters = buildFilters(tags, r, lat, lon);
      const overpassQL = `
        [out:json][timeout:25];
        (
          ${filters}
        );
        out center ${limit};
      `;
      try {
        const json = await overpassQuery(overpassQL);
        elements = Array.isArray(json?.elements) ? json.elements : [];
        if (elements.length) break;
      } catch {
        // try next mirror / radius
      }
    }

    const items: Item[] = [];
    for (const el of elements) {
      const tags = el.tags || {};
      const name = pickName(tags);
      const center = el.center || el;
      const eLat = center.lat, eLon = center.lon;
      if (!Number.isFinite(eLat) || !Number.isFinite(eLon)) continue;

      items.push({
        id: el.id,
        title: name || (tags['amenity'] || 'Medical'),
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

    return NextResponse.json({
      ok: true,
      input: { lat, lon, q, kind, radius },
      triedTags: tags,
      count: items.length,
      items: items.slice(0, limit),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
