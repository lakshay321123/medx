const OVERPASS_URL = process.env.OVERPASS_API_URL!;
const UA = process.env.OVERPASS_USER_AGENT || "medx-app";

type Filter =
  | { k: "amenity"; v: string }
  | { k: "healthcare"; v: string }
  | { k: "healthcare:speciality"; v: string };

const BASE_FILTERS: Record<import("./types").NearbyType, Filter[]> = {
  doctor: [{ k: "amenity", v: "doctors" }, { k: "healthcare", v: "doctor" }],
  specialist: [{ k: "amenity", v: "doctors" }, { k: "healthcare", v: "doctor" }],
  hospital: [{ k: "amenity", v: "hospital" }, { k: "healthcare", v: "hospital" }],
  clinic: [{ k: "amenity", v: "clinic" }, { k: "healthcare", v: "clinic" }],
  lab: [
    { k: "healthcare", v: "laboratory" },
    { k: "amenity", v: "laboratory" },
    { k: "amenity", v: "diagnostic_centre" },
    { k: "healthcare", v: "diagnostic_centre" },
  ],
  pharmacy: [{ k: "amenity", v: "pharmacy" }],
};

export function buildOverpassQuery(
  lat: number,
  lng: number,
  radiusM: number,
  type: import("./types").NearbyType,
  speciality?: string
) {
  const filters = BASE_FILTERS[type];
  const blocks = filters.map(
    (f) =>
      `node["${f.k}"="${f.v}"](around:${radiusM},${lat},${lng});\n` +
      `way["${f.k}"="${f.v}"](around:${radiusM},${lat},${lng});\n` +
      `relation["${f.k}"="${f.v}"](around:${radiusM},${lat},${lng});`
  );

  const specialityClause =
    speciality
      ? `  nwr["healthcare:speciality"~"${speciality}", i](around:${radiusM},${lat},${lng});\n`
      : "";

  return `
[out:json][timeout:30];
(
${blocks.join("\n")}
${specialityClause}
);
out center tags;`;
}

export async function callOverpass(query: string) {
  const r = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain", "User-Agent": UA },
    body: query,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`overpass_${r.status}`);
  return JSON.parse(txt);
}
