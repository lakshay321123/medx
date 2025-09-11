import type { NearbyItem, NearbyType } from "./types";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371,
    dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

function oneLineAddress(tags: any) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"] || tags["addr:neighbourhood"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.join(", ");
}

function inferType(tags: any): NearbyType | null {
  if (tags.amenity === "hospital" || tags.healthcare === "hospital") return "hospital";
  if (tags.amenity === "clinic" || tags.healthcare === "clinic") return "clinic";
  if (tags.amenity === "doctors" || tags.healthcare === "doctor") return "doctor";
  if (tags.healthcare === "laboratory" || tags.amenity === "laboratory") return "lab";
  if (tags.amenity === "pharmacy") return "pharmacy";
  return null;
}

export function mapOverpassElements(
  els: any[],
  center: { lat: number; lng: number },
  requested: NearbyType
): NearbyItem[] {
  return els.map((e: any) => {
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    const tags = e.tags || {};
    const t = requested === "specialist" ? "specialist" : inferType(tags) || requested;
    const spec = tags["healthcare:speciality"]?.split(";")?.[0];
    const item: NearbyItem = {
      id: `${e.type}/${e.id}`,
      osmType: e.type,
      type: t,
      name: tags.name || "Unnamed",
      specialty: spec,
      address: oneLineAddress(tags),
      phone: tags.phone || tags["contact:phone"],
      website: tags.website || tags["contact:website"],
      hours: tags.opening_hours,
      location: { lat, lng },
      distance_km: lat && lng ? Number(haversineKm(center, { lat, lng }).toFixed(2)) : 0,
    };
    return item;
  });
}
