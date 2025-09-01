import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// --- utilities (keep local so we don't depend on other files) ---

type LatLng = { lat: number; lon: number };

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Normalize free-text (“docs”, “doctor”, “chemist”, etc.)
type NearbyKind = 'doctor' | 'clinic' | 'hospital' | 'pharmacy';
function normalizeKind(input?: string): NearbyKind | null {
  if (!input) return null;
  const s = input.toLowerCase();
  if (/(^|\s)(doc|docs|doctor|doctors|gp|physician|family doctor)(\s|$)/.test(s)) return 'doctor';
  if (/(^|\s)(hosp|hospital|medical center|medical centre|er|emergency)(\s|$)/.test(s)) return 'hospital';
  if (/(^|\s)(clinic|polyclinic|urgent care|health centre|health center)(\s|$)/.test(s)) return 'clinic';
  if (/(^|\s)(pharm|pharmacy|chemist|drugstore|medical shop|medical store)(\s|$)/.test(s)) return 'pharmacy';
  return null;
}

// Overpass mirrors + POST helper
const MIRRORS = [
  process.env.OVERPASS_URL || '',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
].filter(Boolean);

async function overpass(body: string, attempt = 0): Promise<any> {
  const url = MIRRORS[attempt % MIRRORS.length];
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 15000 + attempt * 3000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: 'data=' + encodeURIComponent(body),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

// Build a single query that tries multiple amenity tags at once
function buildCombinedQuery(tags: string[], lat: number, lon: number, radiusMeters: number) {
  const filters = tags
    .map(t => `nwr[${t}](around:${radiusMeters},${lat},${lon});`)
    .join(String.fromCharCode(10));
  return `
    [out:json][timeout:25];
    (
      ${filters}
    );
    out center tags;
  `;
}

export async function GET() {
  return NextResponse.json({ ok: true, ping: 'nearby-alive' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const q: string | undefined = body.q;
    const kindIn: string | undefined = body.kind;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ ok:false, error:'Missing lat/lon' }, { status: 400 });
    }

    // 1) normalize requested kind
    const primary: NearbyKind = normalizeKind(kindIn || q || '') || 'doctor';

    // 2) fallback order (broadens results for regions with sparse “doctors” nodes)
    const fallbackOrder: Record<NearbyKind, NearbyKind[]> = {
      doctor:   ['doctor','clinic','hospital','pharmacy'],
      clinic:   ['clinic','doctor','hospital','pharmacy'],
      hospital: ['hospital','clinic','doctor','pharmacy'],
      pharmacy: ['pharmacy','clinic','hospital','doctor'],
    };
    const order = fallbackOrder[primary];

    // 3) amenity tags matching the order (in one query)
    const amenityMap: Record<NearbyKind,string> = {
      doctor: 'amenity=doctors',
      clinic: 'amenity=clinic',
      hospital: 'amenity=hospital',
      pharmacy: 'amenity=pharmacy',
    };
    const tagsByOrder = order.map(k => amenityMap[k]);

    // 4) try growing radii: 2km → 6km → 12km → 20km
    const radii = [2000, 6000, 12000, 20000];

    let elements: any[] = [];
    let attempt = 0;
    outer:
    for (const r of radii) {
      // combined query for all amenity types in fallback order
      const query = buildCombinedQuery(tagsByOrder, lat, lon, r);
      for (let t = 0; t < MIRRORS.length && t < 3; t++) {
        try {
          const json = await overpass(query, attempt++);
          const list = Array.isArray(json?.elements) ? json.elements : [];
          if (list.length) { elements = list; break outer; }
        } catch {
          /* try next mirror */
        }
      }
    }

    // 5) normalize, compute distance, sort
    const items = elements.map((el: any) => {
      const center = el.center || el; // nodes have lat/lon; ways/relations have center
      const pos = { lat: center.lat, lon: center.lon };
      const distKm = haversineKm({ lat, lon }, pos);
      return {
        id: el.id,
        type: el.type,
        name: el.tags?.name || el.tags?.['name:en'] || '(Unnamed)',
        tags: el.tags || {},
        lat: pos.lat,
        lon: pos.lon,
        distanceKm: Number(distKm.toFixed(2)),
      };
    }).sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      ok: true,
      queryKind: primary,
      count: items.length,
      items,
    });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: String(e?.message || e) }, { status: 500 });
  }
}

