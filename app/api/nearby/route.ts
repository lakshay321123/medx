import { NextResponse } from "next/server";

type Body = {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: string; // e.g. "pharmacy", "doctor", "gynecologist"
};

const BASE_SELECTORS = [
  'amenity="doctors"',
  'healthcare="doctor"',
  'amenity="clinic"',
  'amenity="hospital"',
  'healthcare="hospital"',
];

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildAddress(tags: any): string | null {
  if (!tags) return null;
  const parts = [
    tags["addr:housename"],
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:suburb"] || tags["addr:district"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function pickPhone(tags: any): string | null {
  const cands = [tags?.phone, tags?.["contact:phone"], tags?.["contact:mobile"], tags?.["contact:tel"]];
  return cands.find(Boolean) || null;
}

function tidyName(raw?: string): string {
  if (!raw) return "(Unnamed)";
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([A-Za-z][a-z']*)\b/g, m => m[0].toUpperCase() + m.slice(1));
}

export async function POST(req: Request) {
  try {
    const { lat, lng, category, radiusKm = 5 } = (await req.json()) as Body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const radiusM = Math.round(radiusKm * 1000);
    let q: string;

    if (category === "pharmacy") {
      const around = `around:${radiusM},${lat},${lng}`;
      const sel = 'amenity="pharmacy"';
      const union = `
  node[${sel}](${around});
  way[${sel}](${around});
  relation[${sel}](${around});
`;
      q = `
  [out:json][timeout:25];
  (
    ${union}
  );
  out center tags;
`.trim();
    } else {
      const around = `around:${radiusM},${lat},${lng}`;
      const union = BASE_SELECTORS.map(sel => `
  node[${sel}](${around});
  way[${sel}](${around});
  relation[${sel}](${around});
`).join("\n");
      q = `
  [out:json][timeout:25];
  (
    ${union}
  );
  out center tags;
`.trim();
    }

    const endpoint = process.env.OVERPASS_ENDPOINT?.trim() || "https://overpass-api.de/api/interpreter";
    const apiKey = process.env.OVERPASS_API_KEY?.trim();

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: new URLSearchParams({ data: q }).toString(),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `Overpass error ${res.status}: ${txt.slice(0, 200)}` }, { status: 502 });
    }

    const json = await res.json();
    const elements = Array.isArray(json?.elements) ? json.elements : [];

    function mapOverpassResults(els: any[]) {
      return els
        .map(e => {
          const center = e.center || (e.lat && e.lon ? { lat: e.lat, lon: e.lon } : null);
          if (!center) return null;
          const name = tidyName(e.tags?.name);
          const address = buildAddress(e.tags);
          const phone = pickPhone(e.tags);
          const lat2 = center.lat, lng2 = center.lon;
          const distKm = haversineKm({ lat, lng }, { lat: lat2, lng: lng2 });
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat2},${lng2}`;
          return { name, address, phone, distanceKm: distKm, mapsUrl, tags: e.tags || {} };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
        .slice(0, 10);
    }

    let results = mapOverpassResults(elements);

    const specialityMap: Record<string, RegExp> = {
      gynecologist: /\b(gyn|obgyn|ob[-\s]?gyn|obstetric|maternity|women)\b/i,
      chiropractor: /\b(chiro|chiropractic)\b/i,
      cardiovascular: /\b(cardio|heart|vascular|angioplasty)\b/i,
      pediatrician: /\b(pediatric|paediatric|child)\b/i,
      dermatologist: /\b(derma|skin)\b/i,
      neurologist: /\b(neuro|brain|nerve)\b/i,
    };

    if (category && specialityMap[category]) {
      const regex = specialityMap[category];
      const filtered = results.filter(r =>
        regex.test(r.name) ||
        regex.test(r.tags?.speciality || "") ||
        regex.test(r.tags?.description || "")
      );
      if (filtered.length > 0) results = filtered;
    } else if (category === "hospital") {
      const regex = /hospital/i;
      const filtered = results.filter(r =>
        regex.test(r.name) ||
        regex.test(r.tags?.amenity || "") ||
        regex.test(r.tags?.healthcare || "")
      );
      if (filtered.length > 0) results = filtered;
    }

    const items = results.map(({ tags, ...rest }) => rest);

    return NextResponse.json({ items, center: { lat, lng }, radiusKm });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "nearby failed" }, { status: 500 });
  }
}

