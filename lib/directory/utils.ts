export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(c)));
}

export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/[^0-9+]/g, "").trim() || null;
}

export function shortAddressFrom(tags: Record<string, string | undefined>): string | null {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(", ");
}

export function extractAmenities(tags: Record<string, string | undefined>): string[] {
  const list: string[] = [];
  if (tags["wheelchair"] === "yes") list.push("Wheelchair access");
  if (tags["cash_withdrawal"] === "yes" || tags["payment:cash"] === "yes") list.push("Cashless");
  if (tags["payment:credit_cards"] === "yes") list.push("Cards accepted");
  if (tags["drive_through"] === "yes") list.push("Drive-through");
  if (tags["air_conditioning"] === "yes") list.push("Air conditioning");
  return Array.from(new Set(list));
}

export function extractServices(tags: Record<string, string | undefined>): string[] {
  const services: string[] = [];
  const raw =
    tags["services"] ||
    tags["healthcare:speciality"] ||
    tags["amenity"] ||
    tags["healthcare"];

  if (raw) {
    raw
      .split(";")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(s => services.push(capitalize(s)));
  }

  const extra = tags["service"];
  if (extra) {
    extra
      .split(";")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(s => services.push(capitalize(s)));
  }

  return Array.from(new Set(services));
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export function getCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
