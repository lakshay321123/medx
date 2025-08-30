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

function buildFilters(kind?: string) {
  const k = (kind || 'any').toLowerCase();
  if (k === 'doctor') {
    return [
      `node["amenity"="doctors"]`,
      `way["amenity"="doctors"]`,
      `relation["amenity"="doctors"]`,
      `node["healthcare"="doctor"]`,
      `way["healthcare"="doctor"]`,
      `relation["healthcare"="doctor"]`,
    ];
  }
  if (k === 'clinic') {
    return [
      `node["amenity"="clinic"]`,
      `way["amenity"="clinic"]`,
      `relation["amenity"="clinic"]`,
      `node["healthcare"="clinic"]`,
      `way["healthcare"="clinic"]`,
      `relation["healthcare"="clinic"]`,
    ];
  }
  if (k === 'hospital') {
    return [
      `node["amenity"="hospital"]`,
      `way["amenity"="hospital"]`,
      `relation["amenity"="hospital"]`,
      `node["healthcare"="hospital"]`,
      `way["healthcare"="hospital"]`,
      `relation["healthcare"="hospital"]`,
    ];
  }
  if (k === 'pharmacy') {
    return [
      `node["amenity"="pharmacy"]`,
      `way["amenity"="pharmacy"]`,
      `relation["amenity"="pharmacy"]`,
      `node["healthcare"="pharmacy"]`,
      `way["healthcare"="pharmacy"]`,
      `relation["healthcare"="pharmacy"]`,
      `node["shop"="chemist"]`,
      `way["shop"="chemist"]`,
      `relation["shop"="chemist"]`,
    ];
  }
  // any: union of all common health POIs
  return [
    `node["amenity"~"doctors|clinic|hospital|pharmacy"]`,
    `way["amenity"~"doctors|clinic|hospital|pharmacy"]`,
    `relation["amenity"~"doctors|clinic|hospital|pharmacy"]`,
    `node["healthcare"~"doctor|clinic|hospital|pharmacy"]`,
    `way["healthcare"~"doctor|clinic|hospital|pharmacy"]`,
    `relation["healthcare"~"doctor|clinic|hospital|pharmacy"]`,
    `node["shop"="chemist"]`,
    `way["shop"="chemist"]`,
    `relation["shop"="chemist"]`,
  ];
}

function specialtyRegex(s?: string) {
  if (!s) return null;
  if (s.toLowerCase() === 'gynecology') {
    return /(gyn|gyne|gynaec|gynecol|ob[-\/ ]?gyn|obgyn|obstetric|women|matern)/i;
  }
  return new RegExp(s.replace(/[^a-z0-9_+-]/gi, ''), 'i');
}

function looksLikeBadName(s?: string) {
  if (!s) return true;
  const t = s.trim();
  if (t.length < 4) return true;
  if (/^unknown$/i.test(t)) return true;
  return false;
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371,
    toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat),
    dLon = toRad(b.lon - a.lon);
  const A =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(A));
}

function scoreItemForSpecialty(it: any, spec?: string) {
  if (!spec) return 0;
  const re = specialtyRegex(spec);
  if (!re) return 0;
  const tags = it.tags || {};
  const blob = [
    it.name,
    it.type,
    it.address,
    tags['healthcare:specialty'],
    tags['healthcare:speciality'],
    tags['specialty'],
    tags['speciality'],
  ]
    .filter(Boolean)
    .join(' | ');
  let score = 0;
  if (re.test(blob)) score += 5;
  if (/gyne|ob[-\/ ]?gyn|obgyn|obstetric/i.test(it.name || '')) score += 4;
  if (/doctor|doctors|clinic/i.test(it.type || '')) score += 1;
  return score;
}

function overpassQuery(lat: number, lon: number, radius: number, kind?: string) {
  const filters = buildFilters(kind)
    .map((f) => `${f}(around:${radius},${lat},${lon})`)
    .join(';');
  return `
[out:json][timeout:25];
(
  ${filters};
);
out center 60;
`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
      const lat = parseFloat(searchParams.get('lat') || '');
      const lon = parseFloat(searchParams.get('lon') || '');
      const kind = searchParams.get('kind') || undefined;
      const debug = searchParams.get('debug') === '1';
      const specialty = searchParams.get('specialty') || undefined;
      const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 50);
    const initialRadius = Math.min(
      parseInt(searchParams.get('radius') || '3000', 10),
      12000
    );

    let coords: LatLon | null =
      Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : await ipLookup(req);

    if (!coords) {
      return NextResponse.json(
        { error: 'location_unavailable', hint: 'Call Set location, then try again.' },
        { status: 400 }
      );
    }

    let radius = initialRadius;
    let res: Response;
    let json: any;
    let items: any[] = [];
    let overpassStatus = 0;

    while (true) {
      const q = overpassQuery(coords.lat, coords.lon, radius, kind);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': UA,
        },
        body: new URLSearchParams({ data: q }),
        cache: 'no-store',
      } as const;

      res = await fetch('https://overpass-api.de/api/interpreter', options).catch(
        () => null as any
      );
      if (!res || !res.ok) {
        res = await fetch('https://overpass.kumi.systems/api/interpreter', options);
      }
      overpassStatus = res.status;
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: 'overpass_error', status: res.status, text },
          { status: 502 }
        );
      }

      json = await res.json();
      items =
        (json?.elements || []).map((el: any) => {
          const center = el.type === 'node' ? { lat: el.lat, lon: el.lon } : el.center;
          const tags = el.tags || {};
          return {
            id: `${el.type}/${el.id}`,
            name: tags.name || tags['operator'] || 'Unknown',
            type: tags.amenity || tags.healthcare || tags.shop || 'facility',
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
            tags,
          };
        }) ?? [];

      for (const it of items) {
        if (it.lat && it.lon) {
          const d = distanceKm(coords, { lat: it.lat, lon: it.lon });
          (it as any).distance_km = Math.round(d * 10) / 10;
        }
      }

      if (items.length > 0 || radius >= 12000) break;
      radius = Math.min(radius * 2, 12000);
    }

      // Results shaping
      let results = items.filter((it: any) => !looksLikeBadName(it.name));

      // EXCLUDE pharmacies for doctor/clinic/hospital paths earlier in buildFilters()

      if (specialty === 'gynecology') {
        // STRICT: require specialty hit in tags/name/address; exclude obvious mismatches
        const re = specialtyRegex(specialty)!;
        const strict = results.filter((it: any) => {
          const tags = it.tags || {};
          const blob = [
            it.name,
            it.type,
            it.address,
            tags['healthcare:specialty'],
            tags['healthcare:speciality'],
            tags['specialty'],
            tags['speciality'],
          ]
            .filter(Boolean)
            .join(' | ');
          const name = (it.name || '').toLowerCase();
          if (/(beauty|salon|hair replacement|physio|skin clinic|path ?lab)/i.test(name))
            return false;
          return re.test(blob);
        });

        if (strict.length >= 6) {
          results = strict;
        } else {
          // Not enough strict hits → blend by specialty score + proximity
          for (const it of results) {
            (it as any)._score =
              scoreItemForSpecialty(it, specialty) +
              (typeof it.distance_km === 'number'
                ? it.distance_km <= 2
                  ? 3
                  : it.distance_km <= 5
                  ? 2
                  : it.distance_km <= 10
                  ? 1
                  : 0
                : 0);
          }
          results.sort((a: any, b: any) => (b._score || 0) - (a._score || 0));
        }
      }

      // Prefer entries that have contact info
      results.sort((a: any, b: any) => {
        const A = (a.address ? 1 : 0) + (a.phone ? 1 : 0);
        const B = (b.address ? 1 : 0) + (b.phone ? 1 : 0);
        return B - A;
      });

      // Deduplicate by name+address and limit
      const seen = new Set<string>();
      results = results
        .filter((it: any) => {
          const k = `${(it.name || '').toLowerCase()}|${(it.address || '').toLowerCase()}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .slice(0, limit);

      const response: any = { coords, items: results };
      if (debug) {
        response.overpassStatus = overpassStatus;
        response.elementCount = json?.elements?.length ?? 0;
      }
      return NextResponse.json(response);
  } catch (e: any) {
    return NextResponse.json({ error: 'nearby_unhandled', message: e?.message }, { status: 500 });
  }
}
