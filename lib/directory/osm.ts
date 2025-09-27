import { rankPlace } from "./rank";
import type { DirectoryPlace, DirectorySearchParams, DirectoryPlaceType } from "./types";
import {
  distanceMeters,
  extractAmenities,
  extractServices,
  sanitizePhone,
  setCache,
  getCache,
  shortAddressFrom,
} from "./utils";

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = (Number(process.env.NEARBY_CACHE_TTL_SEC || 3600) || 3600) * 1000;

const searchCache = new Map<string, { expiresAt: number; value: DirectoryPlace[] }>();
const detailCache = new Map<string, { expiresAt: number; value: DirectoryPlace | null }>();

const TYPE_SELECTORS: Record<DirectoryPlaceType, string[]> = {
  doctor: [
    'node["amenity"="doctors"]',
    'way["amenity"="doctors"]',
    'node["healthcare"="doctor"]',
    'way["healthcare"="doctor"]',
    'node["amenity"="clinic"]',
    'way["amenity"="clinic"]',
  ],
  pharmacy: [
    'node["amenity"="pharmacy"]',
    'way["amenity"="pharmacy"]',
    'relation["amenity"="pharmacy"]',
  ],
  lab: [
    'node["healthcare"="laboratory"]',
    'way["healthcare"="laboratory"]',
    'relation["healthcare"="laboratory"]',
    'node["amenity"="laboratory"]',
    'way["amenity"="laboratory"]',
    'relation["amenity"="laboratory"]',
  ],
};

function normalizeType(element: any, requested: DirectoryPlaceType): DirectoryPlaceType {
  if (requested !== "doctor") return requested;
  const speciality = element.tags?.["healthcare:speciality"] || "";
  if (speciality.toLowerCase().includes("lab")) return "lab";
  return requested;
}

function parseHours(opening: string | undefined): Record<string, string> | null {
  if (!opening) return null;
  const parts = opening.split(";").map(s => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const hours: Record<string, string> = {};
  parts.forEach((part, index) => {
    hours[`slot${index + 1}`] = part;
  });
  return hours;
}

function parseSpecialties(tags: Record<string, string | undefined>): string[] {
  const value = tags["healthcare:speciality"] || tags["speciality"] || tags["specialty"];
  if (!value) return [];
  return Array.from(new Set(
    value
      .split(";")
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => v.charAt(0).toUpperCase() + v.slice(1)),
  ));
}

function buildPlace(
  element: any,
  origin: { lat: number; lng: number },
  requestedType: DirectoryPlaceType,
): DirectoryPlace {
  const tags: Record<string, string | undefined> = element.tags ?? {};
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  const geo = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  const distance = geo ? Math.round(distanceMeters(origin, geo)) : null;
  const phoneCandidates = [
    sanitizePhone(tags.phone),
    sanitizePhone(tags["contact:phone"]),
    sanitizePhone(tags["contact:mobile"]),
    sanitizePhone(tags["mobile"]),
  ].filter((value): value is string => Boolean(value));
  const phones = Array.from(new Set(phoneCandidates));
  const whatsapp = sanitizePhone(tags["contact:whatsapp"] || tags["whatsapp"] || null);

  const source: DirectoryPlace["source"] = "osm";
  const place: DirectoryPlace = {
    id: `osm:${element.type}/${element.id}`,
    name: tags.name || tags["name:en"] || "(Unnamed)",
    type: normalizeType(element, requestedType),
    specialties: parseSpecialties(tags),
    rating: null,
    reviews_count: null,
    price_level: null,
    distance_m: distance,
    open_now: tags.opening_hours?.includes("24/7") || tags["opening_hours:signed"] === "yes" ? true : null,
    hours: parseHours(tags.opening_hours),
    phones,
    whatsapp,
    address_short: shortAddressFrom(tags),
    geo,
    amenities: extractAmenities(tags),
    services: extractServices(tags),
    images: [],
    source,
    last_checked: new Date().toISOString(),
    rank_score: 0,
    raw: undefined,
  };

  place.rank_score = rankPlace(place);
  return place;
}

async function fetchOverpass(query: string) {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "MedxDirectory/1.0",
    },
    body: new URLSearchParams({ data: query }).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`overpass_${response.status}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.elements)) return [];
  return payload.elements;
}

export async function searchOsmPlaces(params: DirectorySearchParams): Promise<DirectoryPlace[]> {
  const key = JSON.stringify(params);
  const cached = getCache(searchCache, key);
  if (cached !== undefined) return cached;

  const selectors = TYPE_SELECTORS[params.type] ?? TYPE_SELECTORS.pharmacy;
  const query = `
    [out:json][timeout:30];
    (
      ${selectors.map(sel => `${sel}(around:${Math.round(params.radius)},${params.lat},${params.lng});`).join("\n")}
    );
    out center tags;
  `;

  const elements = await fetchOverpass(query.trim());
  const origin = { lat: params.lat, lng: params.lng };
  const places = elements
    .map((element: any) => buildPlace(element, origin, params.type))
    .filter((place: DirectoryPlace) => place.geo !== null);

  const results = params.query
    ? places.filter(place =>
        place.name.toLowerCase().includes(params.query!.toLowerCase()) ||
        place.specialties.some(spec => spec.toLowerCase().includes(params.query!.toLowerCase())),
      )
    : places;

  const sorted = results.sort((a, b) => b.rank_score - a.rank_score);
  setCache(searchCache, key, sorted, CACHE_TTL_MS);
  return sorted;
}

export async function fetchOsmPlaceById(id: string): Promise<DirectoryPlace | null> {
  const cached = getCache(detailCache, id);
  if (cached !== undefined) return cached;

  if (!id.startsWith("osm:")) return null;
  const [, rest] = id.split(":", 2);
  if (!rest) return null;
  const [type, osmId] = rest.split("/");
  if (!type || !osmId) return null;

  const query = `
    [out:json][timeout:25];
    ${type}(id:${osmId});
    out center tags;
  `;

  const elements = await fetchOverpass(query.trim());
  const element = Array.isArray(elements) && elements.length > 0 ? elements[0] : null;
  if (!element) {
    setCache(detailCache, id, null, CACHE_TTL_MS);
    return null;
  }

  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  const place = buildPlace(element, { lat, lng }, "doctor");
  setCache(detailCache, id, place, CACHE_TTL_MS);
  return place;
}
