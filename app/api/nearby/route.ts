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

function esc(s: string) {
  return s.replace(/[^a-z0-9_+-]/gi, '');
}

function specialtyRegex(s?: string) {
  if (!s) return '';
  // cover both English spellings and OSM variants:
  if (s === 'gynecology')
    return '(gyn|gyne|gynaecology|gynecology|obstetrics|ob-gyn|obgyn|ob\\/gyn|women|maternity)';
  // add more specialties here as you expand:
  if (s === 'cardiology') return '(cardio|cardiology)';
  if (s === 'dermatology') return '(derma|dermatology|skin)';
  return `(${esc(s)})`;
}

function buildFilters(kind?: string, specialty?: string) {
  const sp = specialtyRegex(specialty);
  const anyBlocks = [
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

  const withSpecialty = (blocks: string[]) => {
    if (!specialty) return blocks;
    const specTag = [
      `["healthcare:specialty"~"${sp}", i]`,
      `["healthcare:speciality"~"${sp}", i]`,
      `["specialty"~"${sp}", i]`,
      `["speciality"~"${sp}", i]`,
      `["name"~"${sp}", i]`,
    ];
    return blocks.map((b) => `${b}${specTag.join('')}`);
  };

  const k = (kind || 'any').toLowerCase();
  if (k === 'doctor') {
    return withSpecialty([
      `node["amenity"="doctors"]`,
      `way["amenity"="doctors"]`,
      `relation["amenity"="doctors"]`,
      `node["healthcare"="doctor"]`,
      `way["healthcare"="doctor"]`,
      `relation["healthcare"="doctor"]`,
    ]);
  }
  if (k === 'clinic') {
    return withSpecialty([
      `node["amenity"="clinic"]`,
      `way["amenity"="clinic"]`,
      `relation["amenity"="clinic"]`,
      `node["healthcare"="clinic"]`,
      `way["healthcare"="clinic"]`,
      `relation["healthcare"="clinic"]`,
    ]);
  }
  if (k === 'hospital') {
    return withSpecialty([
      `node["amenity"="hospital"]`,
      `way["amenity"="hospital"]`,
      `relation["amenity"="hospital"]`,
      `node["healthcare"="hospital"]`,
      `way["healthcare"="hospital"]`,
      `relation["healthcare"="hospital"]`,
    ]);
  }
  if (k === 'pharmacy') {
    // pharmacies + chemists
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
  return withSpecialty(anyBlocks);
}

function overpassQuery(
  lat: number,
  lon: number,
  radius: number,
  kind?: string,
  specialty?: string
) {
  const filters = buildFilters(kind, specialty)
    .map((f) => `${f}(around:${radius},${lat},${lon})`)
    .join(';\n  ');
  return `
[out:json][timeout:25];
(
  ${filters};
);
out center 80;
`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lon = parseFloat(searchParams.get('lon') || '');
    const kind = searchParams.get('kind') || undefined;
    const specialty = searchParams.get('specialty') || undefined;
    const debug = searchParams.get('debug') === '1';
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
      const q = overpassQuery(coords.lat, coords.lon, radius, kind, specialty);
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
          };
        }) ?? [];

      if (items.length > 0 || radius >= 12000) break;
      radius = Math.min(radius * 2, 12000);
    }

    if (specialty) {
      const re = new RegExp(specialtyRegex(specialty), 'i');
      items.sort((a: any, b: any) => {
        const am = re.test(a.name || '') || re.test(a.type || '');
        const bm = re.test(b.name || '') || re.test(b.type || '');
        return (bm ? 1 : 0) - (am ? 1 : 0);
      });
    }

    const response: any = { coords, items };
    if (debug) {
      response.overpassStatus = overpassStatus;
      response.elementCount = json?.elements?.length ?? 0;
    }
    return NextResponse.json(response);
  } catch (e: any) {
    return NextResponse.json({ error: 'nearby_unhandled', message: e?.message }, { status: 500 });
  }
}
