import { NextResponse } from "next/server";

// Approx meters per degree lat/lng at Delhi-ish lat
const METERS_PER_DEG_LAT = 111_320;

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
  source: "osm";
  source_ref?: string;
  last_checked?: string;
  rank_score?: number;
};

function buildOverpassQL(lat: number, lng: number, radius: number, kinds: string[]) {
  const selectors = kinds
    .map(
      (k) => `
        node(around:${radius},${lat},${lng})${k};
        way(around:${radius},${lat},${lng})${k};
        relation(around:${radius},${lat},${lng})${k};
      `,
    )
    .join("\n");

  return `
    [out:json][timeout:25];
    (
      ${selectors}
    );
    out tags center 200;
  `;
}

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

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dx = (b.lng - a.lng) * (Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) * METERS_PER_DEG_LAT);
  const dy = (b.lat - a.lat) * METERS_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

function tag(obj: any, key: string) {
  return obj?.tags?.[key];
}

function normalizeType(tags: any): Place["type"] {
  const amenity = tag(tags, "amenity");
  const healthcare = tag(tags, "healthcare");

  if (amenity === "pharmacy") return "pharmacy";
  if (amenity === "hospital" || healthcare === "hospital") return "hospital";
  if (amenity === "clinic" || healthcare === "clinic") return "clinic";
  if (amenity === "doctors" || healthcare === "doctor") return "doctor";
  if (healthcare === "laboratory" || amenity === "laboratory") return "lab";
  return "clinic";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = Math.min(parseInt(searchParams.get("radius") || "5000", 10), 20_000);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const type = (searchParams.get("type") || "all").toLowerCase();
  const maxKm = parseFloat(searchParams.get("max_km") || "");
  const openNow = searchParams.get("open_now") === "1";
  const minRating = parseFloat(searchParams.get("min_rating") || "");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const filters = kindFilters(type);
  const body = buildOverpassQL(lat, lng, radius, filters);

  let json: any;
  try {
    const resp = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "User-Agent": "SecondOpinion/1.0 (directory search) contact: support@secondopinion.local",
      },
      body,
    });

    if (!resp.ok) {
      return NextResponse.json({ error: "overpass error", status: resp.status }, { status: 502 });
    }

    json = await resp.json();
  } catch (error) {
    return NextResponse.json({ error: "overpass fetch failed" }, { status: 502 });
  }

  const now = new Date().toISOString();
  const origin = { lat, lng };

  const places: Place[] = (json.elements || [])
    .map((el: any) => {
      const center = el.center || { lat: el.lat, lon: el.lon };
      const name = tag(el, "name") || tag(el, "addr:housename") || "Unnamed";
      const phone = tag(el, "phone") || tag(el, "contact:phone");
      const whatsapp = tag(el, "contact:whatsapp") || null;
      const addr = [
        tag(el, "addr:housenumber"),
        tag(el, "addr:street"),
        tag(el, "addr:neighbourhood"),
        tag(el, "addr:city"),
      ]
        .filter(Boolean)
        .join(", ");

      const centerLat = center?.lat;
      const centerLng = center?.lon;

      const place: Place = {
        id: String(el.id),
        name,
        type: normalizeType(el.tags || {}),
        rating: undefined,
        reviews_count: undefined,
        price_level: undefined,
        distance_m:
          Number.isFinite(centerLat) && Number.isFinite(centerLng)
            ? Math.round(distanceMeters(origin, { lat: centerLat, lng: centerLng }))
            : undefined,
        open_now: openNow ? true : undefined,
        hours: undefined,
        phones: phone ? [phone] : undefined,
        whatsapp,
        address_short: addr || tag(el, "addr:full") || tag(el, "addr:place") || undefined,
        geo: { lat: centerLat ?? lat, lng: centerLng ?? lng },
        amenities: [],
        services: [],
        images: [],
        source: "osm",
        source_ref: String(el.id),
        last_checked: now,
      };

      return place;
    })
    .filter(Boolean);

  let filtered = places;

  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.address_short || "").toLowerCase().includes(q),
    );
  }

  if (Number.isFinite(maxKm)) {
    filtered = filtered.filter((p) => (p.distance_m ?? Number.POSITIVE_INFINITY) <= (maxKm as number) * 1000);
  }

  if (Number.isFinite(minRating)) {
    filtered = filtered.filter((p) => (p.rating ?? 5) >= (minRating as number));
  }

  filtered.sort(
    (a, b) => (a.distance_m ?? Number.POSITIVE_INFINITY) - (b.distance_m ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name),
  );

  return NextResponse.json({
    data: filtered.slice(0, 120),
    updatedAt: now,
  });
}
