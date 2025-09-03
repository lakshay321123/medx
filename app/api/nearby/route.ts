import { NextResponse } from "next/server";

type Body = {
  lat: number;
  lng: number;
  radiusKm?: number;
  category: "pharmacy"|"hospital"|"lab"|"doctor"|"gynecologist"|"chiropractor";
};

const CATEGORY_TAGS: Record<Body["category"], string[]> = {
  pharmacy: ['amenity="pharmacy"'],
  hospital: ['amenity="hospital"', 'healthcare="hospital"'],
  lab: ['healthcare="laboratory"', 'amenity="clinic"[name~"(?i)lab|diagnostic|patholog|blood|test"]'],
  doctor: ['amenity="doctors"', 'healthcare="doctor"', 'amenity="clinic"'],
  gynecologist: [
    'amenity="doctors"[healthcare:speciality~"(?i)gyn|ob.?gyn|obstetric|gynaec"]',
    'healthcare="clinic"[healthcare:speciality~"(?i)gyn|ob.?gyn|obstetric|gynaec"]',
    'amenity="doctors"[name~"(?i)gyn|ob.?gyn|women|maternity|obstetric"]',
  ],
  chiropractor: [
    'healthcare="chiropractor"',
    'amenity="doctors"[healthcare:speciality~"(?i)chiro"]',
    'amenity="clinic"[name~"(?i)chiro"]',
  ],
};

function haversineKm(a:{lat:number;lng:number}, b:{lat:number;lng:number}) {
  const R = 6371, toRad = (d:number)=>d*Math.PI/180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildAddress(tags:any): string|null {
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

function tidyName(raw?: string): string {
  if (!raw) return "(Unnamed)";
  const s = raw.replace(/\s+/g, " ").trim();
  return s.replace(/\b([A-Za-z][a-z']*)\b/g, m => m[0].toUpperCase() + m.slice(1));
}

function pickPhone(tags:any): string|null {
  const cands = [tags?.phone, tags?.["contact:phone"], tags?.["contact:mobile"], tags?.["contact:tel"]];
  const v = cands.find(Boolean);
  if (!v) return null;
  return String(v).split(";")[0].trim();
}

function dedupe(items:any[]) {
  const out:any[] = [];
  for (const it of items) {
    const dup = out.find(o =>
      o.name.toLowerCase() === it.name.toLowerCase() &&
      Math.abs(o.lat - it.lat) < 0.001 && Math.abs(o.lng - it.lng) < 0.001
    );
    if (!dup) out.push(it);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { lat, lng, category, radiusKm = 5 } = (await req.json()) as Body;
    if (typeof lat !== "number" || typeof lng !== "number" || !CATEGORY_TAGS[category]) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const radiusM = Math.round(radiusKm * 1000);
    const selectors = CATEGORY_TAGS[category];
    const around = `around:${radiusM},${lat},${lng}`;
    const union = selectors.map(sel => `
  node[${sel}](${around});
  way[${sel}](${around});
  relation[${sel}](${around});
`).join("\n");

    const q = `
      [out:json][timeout:25];
      (
        ${union}
      );
      out center tags;
    `.trim();

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
      return NextResponse.json({ error: `Overpass error ${res.status}: ${txt.slice(0,200)}` }, { status: 502 });
    }

    const json = await res.json();
    const els = Array.isArray(json?.elements) ? json.elements : [];

    let items = els.map((e:any) => {
      const center = e.center || (e.lat && e.lon ? { lat: e.lat, lon: e.lon } : null);
      if (!center) return null;
      const name = tidyName(e.tags?.name);
      const address = buildAddress(e.tags);
      const phone = pickPhone(e.tags);
      const lat2 = center.lat, lng2 = center.lon;
      const distKm = haversineKm({lat,lng},{lat:lat2,lng:lng2});
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat2},${lng2}`;
      return { id: `${e.type}/${e.id}`, name, address, phone, lat: lat2, lng: lng2, distanceKm: distKm, mapsUrl };
    })
    .filter(Boolean)
    .sort((a:any,b:any)=>a.distanceKm-b.distanceKm);

    items = dedupe(items);
    const named = items.filter((x:any)=>x.name !== "(Unnamed)");
    const unnamed = items.filter((x:any)=>x.name === "(Unnamed)").slice(0,2);
    items = [...named, ...unnamed].slice(0,10);

    return NextResponse.json({ items, center: { lat, lng }, radiusKm });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "nearby failed" }, { status: 500 });
  }
}

