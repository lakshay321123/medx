import { NextResponse } from "next/server";

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const MAX_RADIUS_METERS = 10000;
const MIN_RADIUS_METERS = 100;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

const TYPE_TAGS: Record<string, string[]> = {
  pharmacy: [
    `node["amenity"="pharmacy"]`,
    `way["amenity"="pharmacy"]`,
    `relation["amenity"="pharmacy"]`,
  ],
  doctor: [
    `node["amenity"="doctors"]`,
    `way["amenity"="doctors"]`,
    `relation["amenity"="doctors"]`,
  ],
  clinic: [
    `node["amenity"="clinic"]`,
    `way["amenity"="clinic"]`,
    `relation["amenity"="clinic"]`,
  ],
  hospital: [
    `node["amenity"="hospital"]`,
    `way["amenity"="hospital"]`,
    `relation["amenity"="hospital"]`,
  ],
  lab: [
    `node["healthcare"="laboratory"]`,
    `way["healthcare"="laboratory"]`,
    `relation["healthcare"="laboratory"]`,
    `node["amenity"="laboratory"]`,
    `way["amenity"="laboratory"]`,
    `relation["amenity"="laboratory"]`,
  ],
};

const toRad = (d: number) => (d * Math.PI) / 180;
const distM = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const c =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(c));
};

function clampRadius(meters: number) {
  if (!Number.isFinite(meters) || meters <= 0) return MIN_RADIUS_METERS;
  return Math.max(MIN_RADIUS_METERS, Math.min(MAX_RADIUS_METERS, Math.round(meters)));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (process.env.FEATURE_NEARBY !== "true") return NextResponse.json({ results: [] });

  const type = (searchParams.get("type") || "pharmacy").toLowerCase();
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radiusMeters = clampRadius(Number(searchParams.get("radius") || 2000));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "missing_lat_lon", results: [], attribution: "© OpenStreetMap contributors" }, { status: 400 });
  }

  const selectors = TYPE_TAGS[type] || TYPE_TAGS.pharmacy;
  const query = `
    [out:json][timeout:30];
    (
      ${selectors.map((s) => `${s}(around:${radiusMeters},${lat},${lon});`).join("\n")}
    );
    out center tags 60;
  `.trim();

  let attempt = 0;
  let payload: any = null;
  let error: string | undefined;

  while (attempt < RETRY_ATTEMPTS) {
    try {
      const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent": "SecondOpinion/Nearby",
        },
        body: new URLSearchParams({ data: query }).toString(),
        cache: "no-store",
      });

      if (response.ok) {
        payload = await response.json().catch(() => null);
        if (payload) {
          error = undefined;
          break;
        }
        error = "invalid_response";
        break;
      }

      if (response.status === 429 || response.status >= 500) {
        error = "service_busy";
        await delay(RETRY_DELAY_MS);
        attempt += 1;
        continue;
      }

      error = `upstream_${response.status}`;
      payload = await response.json().catch(() => null);
      break;
    } catch (err) {
      error = "network_error";
      break;
    }
  }

  const elements = Array.isArray(payload?.elements) ? payload.elements : [];
  const origin = { lat, lon };
  const results = elements
    .map((el: any) => {
      const plat = Number(el.lat ?? el.center?.lat);
      const plon = Number(el.lon ?? el.center?.lon);
      if (!Number.isFinite(plat) || !Number.isFinite(plon)) return null;

      const name = el.tags?.name || el.tags?.["name:en"] || "(Unnamed)";
      const address = [
        el.tags?.["addr:housenumber"],
        el.tags?.["addr:street"],
        el.tags?.["addr:suburb"],
        el.tags?.["addr:city"],
      ]
        .filter(Boolean)
        .join(", ");

      return {
        name,
        lat: plat,
        lon: plon,
        address: address || undefined,
        phone: el.tags?.phone || el.tags?.["contact:phone"],
        website: el.tags?.website || el.tags?.["contact:website"],
        osm_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        distance_m: Math.round(distM(origin, { lat: plat, lon: plon })),
        opening_hours: el.tags?.opening_hours,
      };
    })
    .filter((p: any): p is {
      name: string;
      lat: number;
      lon: number;
      address?: string;
      phone?: string;
      website?: string;
      osm_url: string;
      distance_m: number;
      opening_hours?: string;
    } => Boolean(p))
    .sort((a, b) => (a.distance_m ?? Number.POSITIVE_INFINITY) - (b.distance_m ?? Number.POSITIVE_INFINITY))
    .slice(0, 25);

  const body: Record<string, unknown> = {
    results,
    attribution: "© OpenStreetMap contributors",
  };

  if (error && !results.length) {
    body.error = error;
  }

  return NextResponse.json(body);
}
