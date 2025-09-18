export type NearbyKind = "pharmacy" | "doctor" | "clinic" | "hospital" | "lab";

export type NearbyPlace = {
  name: string;
  lat: number;
  lon: number;
  distance_m?: number;
  address?: string;
  phone?: string;
  website?: string;
  osm_url: string;
  opening_hours?: string;
};

export type NearbyResponse = {
  results: NearbyPlace[];
  attribution?: string;
  error?: string;
};

export async function getUserPosition(): Promise<{ lat: number; lon: number } | null> {
  if (!("geolocation" in navigator)) return null;
  return new Promise((res) => {
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => res(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
    );
  });
}

export async function fetchNearby(
  kind: NearbyKind,
  lat: number,
  lon: number,
  radiusMeters = 2000,
): Promise<NearbyResponse> {
  const qs = new URLSearchParams({
    type: kind,
    lat: String(lat),
    lon: String(lon),
    radius: String(radiusMeters),
  });

  try {
    const r = await fetch(`/api/nearby?${qs.toString()}`);
    const data = await r.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return { results: [], error: "invalid_response" };
    }
    const results = Array.isArray((data as any).results) ? ((data as any).results as NearbyPlace[]) : [];
    return {
      results,
      attribution: typeof (data as any).attribution === "string" ? (data as any).attribution : undefined,
      error: typeof (data as any).error === "string" ? (data as any).error : undefined,
    };
  } catch (err) {
    return { results: [], error: "network_error" };
  }
}

export async function geocodeArea(query: string): Promise<{ lat: number; lon: number } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const params = new URLSearchParams({ q: trimmed, limit: "1" });
    const r = await fetch(`/api/geo/nominatim?${params.toString()}`, { cache: "no-store" });
    const data = await r.json().catch(() => null);
    const first = Array.isArray(data?.results) ? data.results[0] : null;
    if (!first) return null;
    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}
