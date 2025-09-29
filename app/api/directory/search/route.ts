import { NextResponse } from "next/server";
import { providerLang } from "@/lib/i18n/providerLang";
import { localizeQualifiers } from "@/lib/i18n/qualifierMap";

// meters per degree latitude (simple distance estimate)
const M_PER_DEG = 111_320;

type Place = {
  id: string;
  name: string;
  type: "doctor" | "pharmacy" | "lab" | "hospital" | "clinic";
  category_display?: string;
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

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function composeAddress(components: GoogleAddressComponent[], appLang: string) {
  const lang = providerLang(appLang);
  const by = (t: string) =>
    components.find(c => Array.isArray(c.types) && c.types.includes(t));

  const street = [by("street_number")?.longText, by("route")?.longText]
    .filter(Boolean)
    .join(" ");
  const sublocality = by("sublocality")?.longText ?? by("sublocality_level_1")?.longText;
  const locality = by("locality")?.longText ?? by("postal_town")?.longText;
  const admin2 = by("administrative_area_level_2")?.longText;
  const admin1 = by("administrative_area_level_1")?.longText;
  const postal = by("postal_code")?.longText;
  const countryCode = by("country")?.shortText;

  const country = countryCode
    ? new Intl.DisplayNames(lang, { type: "region" }).of(countryCode)
    : undefined;

  return [street, sublocality, locality, admin2, admin1, postal, country]
    .filter(Boolean)
    .join(", ");
}

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

function normalizeHoursRows(rows: string[] | undefined): Record<string, string> | undefined {
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

function normDetailsHours(opening: any): Record<string, string> | undefined {
  // Google returns weekday_text like ["Monday: 9 AM–9 PM", "Tuesday: 9 AM–9 PM"]
  const rows: string[] | undefined = opening?.weekday_text;
  return normalizeHoursRows(rows);
}

function normDetailsHoursV1(opening: any): Record<string, string> | undefined {
  const rows: string[] | undefined = opening?.weekdayDescriptions;
  return normalizeHoursRows(rows);
}

async function googleNearby({
  lat,
  lng,
  radius,
  uiType,
  q,
  key,
  lang,
}: {
  lat: number;
  lng: number;
  radius: number;
  uiType: string;
  q: string;
  key: string;
  lang: string;
}) {
  const { gType, keyword } = mapUiTypeToGoogle(uiType);
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(Math.min(radius, 20000))); // Google max 50km, we cap to 20km
  if (gType) url.searchParams.set("type", gType);
  const kw = [keyword, q].filter(Boolean).join(" ");
  if (kw) url.searchParams.set("keyword", kw);
  url.searchParams.set("key", key);
  url.searchParams.set("language", lang);

  const resp = await fetch(url.toString(), { cache: "no-store" });
  if (!resp.ok) throw new Error("google nearby failed");
  const j = await resp.json();
  return j?.results ?? [];
}

function humanizeGoogleType(type?: string | null) {
  if (!type) return undefined;
  const map: Record<string, string> = {
    doctor: "Doctor",
    pharmacy: "Pharmacy",
    hospital: "Hospital",
    clinic: "Clinic",
    medical_lab: "Medical Lab",
    health: "Health",
  };
  const lower = type.toLowerCase();
  if (map[lower]) return map[lower];
  return lower
    .split("_")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type GoogleDetails = {
  phone?: string;
  hours?: Record<string, string>;
  formattedAddress?: string;
  displayNameText?: string;
  primaryTypeDisplayNameText?: string;
  addressComponents?: GoogleAddressComponent[];
  composedAddress?: string;
};

async function googlePlaceDetailsV1(placeId: string, key: string, lang: string): Promise<GoogleDetails> {
  const fields = [
    "displayName",
    "primaryTypeDisplayName",
    "formattedAddress",
    "addressComponents",
    "internationalPhoneNumber",
    "regularOpeningHours",
  ].join(",");
  const endpoint = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
  );
  endpoint.searchParams.set("languageCode", lang);
  const res = await fetch(endpoint, {
    headers: {
      "X-Goog-Api-Key": key,
      "Accept-Language": lang,
      "X-Goog-FieldMask": fields,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("google v1 details failed");
  }
  const j = await res.json();
  return {
    phone: j?.internationalPhoneNumber ?? undefined,
    hours: normDetailsHoursV1(j?.regularOpeningHours),
    formattedAddress: j?.formattedAddress ?? undefined,
    displayNameText: j?.displayName?.text ?? undefined,
    primaryTypeDisplayNameText: j?.primaryTypeDisplayName?.text ?? undefined,
    addressComponents: Array.isArray(j?.addressComponents) ? j.addressComponents : undefined,
  };
}

async function googleLegacyDetails(placeId: string, key: string, lang: string): Promise<GoogleDetails> {
  const fields = [
    "formatted_phone_number",
    "international_phone_number",
    "opening_hours",
    "formatted_address",
    "name",
    "types",
  ].join(",");
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", fields);
  url.searchParams.set("key", key);
  url.searchParams.set("language", lang);
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) {
    throw new Error("google legacy details failed");
  }
  const j = await r.json();
  const d = j?.result;
  const phone = d?.international_phone_number || d?.formatted_phone_number;
  const formattedAddress = d?.formatted_address ?? d?.vicinity ?? undefined;
  const rawTypes = Array.isArray(d?.types) ? d.types : [];
  return {
    phone: phone ?? undefined,
    hours: normDetailsHours(d?.opening_hours),
    formattedAddress,
    displayNameText: d?.name ?? undefined,
    primaryTypeDisplayNameText: humanizeGoogleType(rawTypes[0]) ?? undefined,
  };
}

async function googleDetailsBatch(placeIds: string[], key: string, lang: string, appLang: string) {
  // Enrich top N results for phone and opening hours.
  // We limit N to 12 to keep latency and quota sane.
  const N = Math.min(placeIds.length, 12);
  const out = new Map<string, GoogleDetails>();

  for (let i = 0; i < N; i++) {
    const id = placeIds[i];
    try {
      const v1 = await googlePlaceDetailsV1(id, key, lang);
      const composedAddress =
        v1.addressComponents?.length ? composeAddress(v1.addressComponents, appLang) : undefined;
      out.set(id, { ...v1, composedAddress });
    } catch (v1Error) {
      try {
        const legacy = await googleLegacyDetails(id, key, lang);
        out.set(id, { ...legacy, composedAddress: legacy.formattedAddress });
      } catch {
        // ignore errors for individual details calls
      }
    }
  }
  return out;
}

function normalizeGoogleResults(
  results: any[],
  origin: { lat: number; lng: number },
  uiType: string,
  appLang: string,
): Place[] {
  const now = new Date().toISOString();
  return results
    .map((r: any) => {
      const loc = r?.geometry?.location;
      if (!loc) return null;
      const providerName =
        r?.displayName?.text ??
        r?.name ??
        r?.structured_formatting?.main_text ??
        r?.vicinity ??
        r?.plus_code?.compound_code ??
        "Unnamed";
      const localizedName = localizeQualifiers(providerName, appLang);
      const formattedAddress =
        r?.formattedAddress ??
        r?.formatted_address ??
        r?.vicinity ??
        r?.plus_code?.compound_code;
      const primaryTypeDisplayName =
        r?.primaryTypeDisplayName?.text ??
        r?.primary_type_display_name ??
        humanizeGoogleType(Array.isArray(r?.types) ? r.types[0] : undefined);
      const p: Place = {
        id: r.place_id,
        name: localizedName,
        type: (uiType === "all" ? inferTypeFromGoogle(r.types || []) : (uiType as Place["type"])) || "clinic",
        rating: r.rating,
        reviews_count: r.user_ratings_total,
        price_level: r.price_level,
        distance_m: Math.round(distMeters(origin, { lat: loc.lat, lng: loc.lng })),
        open_now: r.opening_hours?.open_now,
        address_short: formattedAddress,
        geo: { lat: loc.lat, lng: loc.lng },
        amenities: [],
        services: [],
        images: [],
        source: "google",
        source_ref: r.place_id,
        last_checked: now,
      };
      if (primaryTypeDisplayName) {
        p.category_display = primaryTypeDisplayName;
      }
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
async function osmFallback(
  lat: number,
  lng: number,
  radius: number,
  uiType: string,
  lang: string,
  appLang: string,
) {
  const shouldLocalizeQualifiers = !appLang.toLowerCase().startsWith("en");
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
      "Accept-Language": lang,
    },
    body,
  });
  if (!r.ok) return [];
  const j = await r.json();
  const origin = { lat, lng };
  const now = new Date().toISOString();
  const langLower = lang.toLowerCase();
  const langBase = langLower.split("-")[0] || langLower;
  const langCandidates = Array.from(new Set([langLower, langBase].filter(Boolean)));
  const res: Place[] = (j.elements || []).map((el: any) => {
    const center = el.center || { lat: el.lat, lon: el.lon };
    const namedetails = el?.namedetails ?? {};
    const localizedName = langCandidates
      .map(code => namedetails?.[`name:${code}`] ?? el?.tags?.[`name:${code}`])
      .find(Boolean);
    const fallbackName =
      namedetails?.name ||
      el?.tags?.name ||
      el?.tags?.["addr:housename"] ||
      el?.tags?.["brand"];
    const providerName = localizedName || el?.localname || fallbackName || "Unnamed";
    const name = shouldLocalizeQualifiers ? localizeQualifiers(providerName, appLang) : providerName;
    const localizedStreet = langCandidates
      .map(code => el?.tags?.[`addr:street:${code}`])
      .find(Boolean);
    const localizedNeighbourhood = langCandidates
      .map(code => el?.tags?.[`addr:neighbourhood:${code}`])
      .find(Boolean);
    const localizedCity = langCandidates
      .map(code => el?.tags?.[`addr:city:${code}`])
      .find(Boolean);
    const localizedFull = langCandidates
      .map(code => el?.tags?.[`addr:full:${code}`])
      .find(Boolean);
    const addrParts = [
      el?.tags?.["addr:housenumber"],
      localizedStreet || el?.tags?.["addr:street"],
      localizedNeighbourhood || el?.tags?.["addr:neighbourhood"],
      localizedCity || el?.tags?.["addr:city"],
    ];
    const addr =
      localizedFull ||
      namedetails?.[`addr:full:${langLower}`] ||
      addrParts.filter(Boolean).join(", ") ||
      el?.tags?.["addr:full"];
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
  const appLang = (searchParams.get("lang") || "en").trim() || "en";
  const lang = providerLang(appLang);
  const cacheKey = [
    "dir",
    q,
    searchParams.get("lat") ?? "",
    searchParams.get("lng") ?? "",
    searchParams.get("radius") ?? "",
    lang,
  ].join("|");
  const globalAny = globalThis as typeof globalThis & {
    __dirCache?: Map<string, { data: Place[]; updatedAt: string; provider: "google" | "osm" }>;
  };
  if (!globalAny.__dirCache) {
    globalAny.__dirCache = new Map();
  }
  const cache = globalAny.__dirCache;

  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const origin = { lat, lng };
  const key = process.env.GOOGLE_PLACES_API_KEY;

  let places: Place[] = [];
  let usedGoogle = false;

  if (key) {
    try {
      const results = await googleNearby({ lat, lng, radius, uiType, q, key, lang });
      let normalized = normalizeGoogleResults(results, origin, uiType, appLang);

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
      const details = await googleDetailsBatch(ids, key, lang, appLang);
      for (const p of normalized) {
        const d = details.get(p.id);
        if (d?.phone) p.phones = [d.phone];
        if (d?.hours) p.hours = d.hours;
        const composedAddress = d?.composedAddress ?? d?.formattedAddress ?? p.address_short;
        if (composedAddress) p.address_short = composedAddress;
        if (d?.primaryTypeDisplayNameText) {
          p.category_display = d.primaryTypeDisplayNameText;
        }
        if (d?.displayNameText) {
          const providerName = d.displayNameText;
          p.name = localizeQualifiers(providerName, appLang);
        }
      }

      normalized.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
      places = uniqueByNameAddr(normalized).slice(0, 120);
      usedGoogle = places.length > 0;
    } catch {
      // fall through to OSM
    }
  }

  if (!usedGoogle) {
    const osm = await osmFallback(lat, lng, radius, uiType, lang, appLang);
    let filtered = osm;
    if (Number.isFinite(maxKm)) filtered = filtered.filter(p => (p.distance_m ?? 1e9) <= maxKm * 1000);
    filtered.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
    places = filtered.slice(0, 120);
  }

  const payload = {
    data: places,
    updatedAt: new Date().toISOString(),
    provider: usedGoogle ? "google" : "osm",
  } as const;

  cache.set(cacheKey, payload);

  return NextResponse.json(payload);
}
