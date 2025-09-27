import { NextResponse } from "next/server";

// meters per degree latitude (simple distance estimate)
const M_PER_DEG = 111_320;

type Place = {
  id: string;
  name: string;
  type: "doctor" | "pharmacy" | "lab" | "hospital" | "clinic";
  rating?: number;
  reviews_count?: number;
  price_level?: number;
  distance_m?: number;
  open_now?: boolean;
  hours?: Record<string, string>;
  phones?: string[];
  whatsapp?: string | null;
  address_short?: string;
  geo: { lat: number; lng: number };
  amenities?: string[];
  services?: string[];
  images?: string[];
  source: "google" | "osm";
  source_ref?: string;
  last_checked?: string;
  rank_score?: number;
};

function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dx = (b.lng - a.lng) * (Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) * M_PER_DEG);
  const dy = (b.lat - a.lat) * M_PER_DEG;
  return Math.sqrt(dx * dx + dy * dy);
}

function mapUiTypeToGoogle(uiType: string) {
  // Prefer Google official "type" when possible, otherwise keyword.
  // doctor and pharmacy and hospital are official; clinic and lab are spotty.
  // We will pass "type" where supported and "keyword" to widen matches.
  const t = uiType.toLowerCase();
  switch (t) {
    case "doctor":
      return { gType: "doctor", keyword: "doctor health clinic" };
    case "pharmacy":
      return { gType: "pharmacy", keyword: "pharmacy chemist medical store" };
    case "hospital":
      return { gType: "hospital", keyword: "hospital" };
    case "clinic":
      return { gType: undefined, keyword: "clinic health doctor polyclinic" };
    case "lab":
      return { gType: undefined, keyword: "medical laboratory diagnostic lab pathology" };
    case "all":
    default:
      return { gType: undefined, keyword: "doctor pharmacy hospital clinic health medical laboratory" };
  }
}

function normDetailsHours(opening: any): Record<string, string> | undefined {
  // Google returns weekday_text like ["Monday: 9 AM–9 PM", ...]
  const rows: string[] | undefined = opening?.weekday_text;
  if (!rows || !Array.isArray(rows)) return undefined;
  const out: Record<string, string> = {};
  rows.forEach((r: string) => {
    const idx = r.indexOf(":");
    if (idx > 0) {
      const day = r.slice(0, idx).toLowerCase(); // "monday"
      out[day] = r.slice(idx + 1).trim();
    }
  });
  return Object.keys(out).length ? out : undefined;
}

async function googleNearby({
  lat,
  lng,
  radius,
  uiType,
  q,
  key,
}: {
  lat: number;
  lng: number;
  radius: number;
  uiType: string;
  q: string;
  key: string;
}) {
  const { gType, keyword } = mapUiTypeToGoogle(uiType);
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(Math.min(radius, 20000))); // Google max 50km, we cap to 20km
  if (gType) url.searchParams.set("type", gType);
  const kw = [keyword, q].filter(Boolean).join(" ");
  if (kw) url.searchParams.set("keyword", kw);
  url.searchParams.set("key", key);

  const resp = await fetch(url.toString(), { cache: "no-store" });
  if (!resp.ok) throw new Error("google nearby failed");
  const j = await resp.json();
  return j?.results ?? [];
}

async function googleDetailsBatch(placeIds: string[], key: string) {
  // Enrich top N results for phone and opening hours.
  // We limit N to 12 to keep latency and quota sane.
  const N = Math.min(placeIds.length, 12);
  const out = new Map<string, { phone?: string; hours?: Record<string, string> }>();

  const fields =
    "formatted_phone_number,international_phone_number,opening_hours,formatted_address";
  for (let i = 0; i < N; i++) {
    const id = placeIds[i];
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", id);
    url.searchParams.set("fields", fields);
    url.searchParams.set("key", key);
    try {
      const r = await fetch(url.toString(), { cache: "no-store" });
      const j = await r.json();
      const d = j?.result;
      const phone = d?.international_phone_number || d?.formatted_phone_number;
      out.set(id, {
        phone,
        hours: normDetailsHours(d?.opening_hours),
      });
    } catch {
      // ignore errors for individual details calls
    }
  }
  return out;
}

function normalizeGoogleResults(results: any[], origin: { lat: number; lng: number }, uiType: string): Place[] {
  const now = new Date().toISOString();
  return results
    .map((r: any) => {
      const loc = r?.geometry?.location;
      if (!loc) return null;
      const p: Place = {
        id: r.place_id,
        name: r.name,
        type: (uiType === "all" ? inferTypeFromGoogle(r.types || []) : (uiType as Place["type"])) || "clinic",
        rating: r.rating,
        reviews_count: r.user_ratings_total,
        price_level: r.price_level,
        distance_m: Math.round(distMeters(origin, { lat: loc.lat, lng: loc.lng })),
        open_now: r.opening_hours?.open_now,
        address_short: r.vicinity || r.formatted_address,
        geo: { lat: loc.lat, lng: loc.lng },
        amenities: [],
        services: [],
        images: [],
        source: "google",
        source_ref: r.place_id,
        last_checked: now,
      };
      return p;
    })
    .filter(Boolean) as Place[];
}

function inferTypeFromGoogle(types: string[]): Place["type"] {
  // order matters
  if (types.includes("pharmacy")) return "pharmacy";
  if (types.includes("hospital")) return "hospital";
  if (types.includes("doctor")) return "doctor";
  if (types.includes("health")) return "clinic";
  if (types.includes("medical_lab")) return "lab";
  return "clinic";
}

function uniqueByNameAddr(list: Place[]) {
  const key = (p: Place) => `${(p.name || "").toLowerCase()}|${(p.address_short || "").toLowerCase()}`;
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of list) {
    const k = key(p);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

// OSM fallback if Google unavailable or empty
async function osmFallback(lat: number, lng: number, radius: number, uiType: string) {
  function kindFilters(type: string) {
    switch (type) {
      case "pharmacy":
        return ['["amenity"="pharmacy"]'];
      case "doctor":
        return ['["amenity"="doctors"]', '["healthcare"="doctor"]'];
      case "lab":
        return ['["healthcare"="laboratory"]', '["amenity"="laboratory"]'];
      case "hospital":
        return ['["amenity"="hospital"]', '["healthcare"="hospital"]'];
      case "clinic":
        return ['["amenity"="clinic"]', '["healthcare"="clinic"]'];
      case "all":
      default:
        return [
          '["amenity"="pharmacy"]',
          '["amenity"="doctors"]',
          '["healthcare"="doctor"]',
          '["healthcare"="laboratory"]',
          '["amenity"="laboratory"]',
          '["amenity"="hospital"]',
          '["healthcare"="hospital"]',
          '["amenity"="clinic"]',
          '["healthcare"="clinic"]',
        ];
    }
  }
  function buildOverpassQL(kinds: string[]) {
    const selectors = kinds.map(k => `
      node(around:${radius},${lat},${lng})${k};
      way(around:${radius},${lat},${lng})${k};
      relation(around:${radius},${lat},${lng})${k};
    `).join("\n");
    return `[out:json][timeout:25];
      (${selectors});
      out tags center 200;`;
  }
  const body = buildOverpassQL(kindFilters(uiType));
  const r = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "User-Agent": "SecondOpinion/1.0 (directory search) support@secondopinion.local",
    },
    body,
  });
  if (!r.ok) return [];
  const j = await r.json();
  const origin = { lat, lng };
  const now = new Date().toISOString();
  const res: Place[] = (j.elements || []).map((el: any) => {
    const center = el.center || { lat: el.lat, lon: el.lon };
    const name = el?.tags?.name || el?.tags?.["addr:housename"] || "Unnamed";
    const addr = [el?.tags?.["addr:housenumber"], el?.tags?.["addr:street"], el?.tags?.["addr:neighbourhood"], el?.tags?.["addr:city"]]
      .filter(Boolean).join(", ");
    const p: Place = {
      id: String(el.id),
      name,
      type: "clinic",
      distance_m: Math.round(distMeters(origin, { lat: center.lat, lng: center.lon })),
      address_short: addr || el?.tags?.["addr:full"],
      geo: { lat: center.lat, lng: center.lon },
      source: "osm",
      source_ref: String(el.id),
      last_checked: now,
    };
    return p;
  });
  res.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
  return res;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = Math.min(parseInt(searchParams.get("radius") || "5000", 10), 20000);
  const uiType = (searchParams.get("type") || "all").toLowerCase();
  const q = (searchParams.get("q") || "").trim();
  const maxKm = parseFloat(searchParams.get("max_km") || "");
  const minRating = parseFloat(searchParams.get("min_rating") || "");
  const openNow = searchParams.get("open_now") === "1";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const origin = { lat, lng };
  const key = process.env.GOOGLE_PLACES_API_KEY;

  let places: Place[] = [];
  let usedGoogle = false;

  if (key) {
    try {
      const results = await googleNearby({ lat, lng, radius, uiType, q, key });
      let normalized = normalizeGoogleResults(results, origin, uiType);

      // optional post filter by rating
      if (Number.isFinite(minRating)) {
        normalized = normalized.filter(p => (p.rating ?? 5) >= minRating);
      }
      if (Number.isFinite(maxKm)) {
        normalized = normalized.filter(p => (p.distance_m ?? 1e9) <= maxKm * 1000);
      }
      if (openNow) {
        normalized = normalized.filter(p => p.open_now !== false);
      }

      // enrich top items with phone and hours
      const ids = normalized.map(p => p.id);
      const details = await googleDetailsBatch(ids, key);
      for (const p of normalized) {
        const d = details.get(p.id);
        if (d?.phone) p.phones = [d.phone];
        if (d?.hours) p.hours = d.hours;
      }

      normalized.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
      places = uniqueByNameAddr(normalized).slice(0, 120);
      usedGoogle = places.length > 0;
    } catch {
      // fall through to OSM
    }
  }

  if (!usedGoogle) {
    const osm = await osmFallback(lat, lng, radius, uiType);
    let filtered = osm;
    if (Number.isFinite(maxKm)) filtered = filtered.filter(p => (p.distance_m ?? 1e9) <= maxKm * 1000);
    filtered.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
    places = filtered.slice(0, 120);
  }

  return NextResponse.json({
    data: places,
    updatedAt: new Date().toISOString(),
    provider: usedGoogle ? "google" : "osm",
  });
}
