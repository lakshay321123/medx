import { NextResponse } from "next/server";

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
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
function distM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const c = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(c));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "pharmacy").toLowerCase();
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = Math.min(Number(searchParams.get("radius") || 2000), 10000);
  if (!lat || !lon || Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "missing_lat_lon" }, { status: 400 });
  }

  const selectors = TYPE_TAGS[type] || TYPE_TAGS.pharmacy;
  const query = `
    [out:json][timeout:30];
    (
      ${selectors.map((s) => `${s}(around:${radius},${lat},${lon});`).join("\n")}
    );
    out center tags 60;
  `.trim();

  let attempt = 0,
    json: any = null,
    ok = false;
  while (attempt < 2) {
    const r = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "user-agent": "SecondOpinion-Nearby/1.0",
      },
      body: new URLSearchParams({ data: query }).toString(),
      cache: "no-store",
    });
    ok = r.ok;
    json = await r.json().catch(() => null);
    if (ok && json) break;
    await new Promise((res) => setTimeout(res, 800));
    attempt++;
  }

  const elements = Array.isArray(json?.elements) ? json.elements : [];
  const origin = { lat, lon };

  const results = elements
    .map((el: any) => {
      const plat = el.lat ?? el.center?.lat;
      const plon = el.lon ?? el.center?.lon;
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
        id: `${el.type}/${el.id}`,
        kind: type,
        name,
        lat: plat,
        lon: plon,
        address: address || undefined,
        phone: el.tags?.phone || el.tags?.["contact:phone"],
        website: el.tags?.website || el.tags?.["contact:website"],
        osm_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        distance_m: plat && plon ? Math.round(distM(origin, { lat: plat, lon: plon })) : undefined,
      };
    })
    .filter((p: any) => p.lat && p.lon)
    .sort((a: any, b: any) => (a.distance_m ?? 1e12) - (b.distance_m ?? 1e12))
    .slice(0, 25);

  return NextResponse.json({ results, attribution: "© OpenStreetMap contributors" });
}
