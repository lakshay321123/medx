export type LatLng = { lat: number; lon: number };

const LS_KEY = 'medx.userLocation.v1';

export function saveLocation(loc: LatLng) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(loc)); } catch {}
}
export function loadLocation(): LatLng | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (typeof obj?.lat === 'number' && typeof obj?.lon === 'number') return obj as LatLng;
  } catch {}
  return null;
}

export function haversineKm(a: LatLng, b: LatLng) {
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

// Client-side geolocation with timeouts & clear errors
export function getClientLocation(
  opts: PositionOptions = { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation not available'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => reject(new Error(err.message || 'Geolocation error')),
      opts
    );
  });
}

// Overpass mirror rotation + fetch with timeout
const DEFAULT_MIRRORS = [
  (process.env.OVERPASS_URL as string) || '', // env preferred (may be empty)
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
].filter(Boolean);

async function fetchWithTimeout(url: string, body: string, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: `data=${encodeURIComponent(body)}`,
      signal: ctrl.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(id);
  }
}

export async function overpassQuery(body: string, mirrors = DEFAULT_MIRRORS, attempts = 3) {
  let lastErr: any;
  for (let i = 0; i < Math.min(attempts, mirrors.length); i++) {
    const url = mirrors[i % mirrors.length];
    try {
      const res = await fetchWithTimeout(url, body, 12000 + i * 3000);
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const json = await res.json();
      return json;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Overpass failed');
}

// Build an Overpass query for kinds: hospital/clinic/pharmacy/doctor
export function buildPOIQuery(kind: string, lat: number, lon: number, radiusMeters: number) {
  // Map UI kinds to OSM tags
  const tag = (() => {
    switch (kind) {
      case 'hospital': return 'amenity=hospital';
      case 'clinic': return 'amenity=clinic';
      case 'pharmacy': return 'amenity=pharmacy';
      case 'doctor': return 'amenity=doctors';
      default: return 'amenity=hospital';
    }
  })();
  // nwr = nodes, ways, relations
  return `
    [out:json][timeout:25];
    (
      nwr[${tag}](around:${radiusMeters},${lat},${lon});
    );
    out center tags;
  `;
}
