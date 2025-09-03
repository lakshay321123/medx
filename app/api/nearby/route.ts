import { NextResponse } from "next/server";

type Body = { lat: number; lng: number; type: "pharmacy"|"hospital"; radiusKm?: number };

const TAGS: Record<Body["type"], string> = {
  pharmacy: 'amenity="pharmacy"',
  hospital: 'amenity="hospital"',
};

function haversineKm(a:{lat:number;lng:number}, b:{lat:number;lng:number}) {
  const R = 6371, toRad = (d:number)=>d*Math.PI/180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function POST(req: Request) {
  try {
    const { lat, lng, type, radiusKm = 5 } = (await req.json()) as Body;
    if (typeof lat !== "number" || typeof lng !== "number" || !TAGS[type]) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const radiusM = Math.round(radiusKm * 1000);
    const tag = TAGS[type];

    const q = `
      [out:json][timeout:25];
      (
        node[${tag}](around:${radiusM},${lat},${lng});
        way[${tag}](around:${radiusM},${lat},${lng});
        relation[${tag}](around:${radiusM},${lat},${lng});
      );
      out center tags;
    `.trim();

    const endpoint = process.env.OVERPASS_ENDPOINT?.trim() || "https://overpass-api.de/api/interpreter";
    const apiKey = process.env.OVERPASS_API_KEY?.trim(); // if your provider uses one

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: new URLSearchParams({ data: q }).toString(),
      // Do not forward cookies; keep server-side to avoid CORS issues.
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `Overpass error ${res.status}: ${txt.slice(0,200)}` }, { status: 502 });
    }

    const json = await res.json();
    const els = Array.isArray(json?.elements) ? json.elements : [];

    const items = els.map((e:any) => {
      const center = e.center || (e.lat && e.lon ? { lat: e.lat, lon: e.lon } : null);
      if (!center) return null;
      const name = e.tags?.name || e.tags?.["addr:housename"] || "(Unnamed)";
      const addr = [
        e.tags?.["addr:housenumber"],
        e.tags?.["addr:street"],
        e.tags?.["addr:suburb"] || e.tags?.["addr:district"],
        e.tags?.["addr:city"] || e.tags?.["addr:town"],
      ].filter(Boolean).join(", ") || null;

      const lat2 = center.lat, lng2 = center.lon;
      const distKm = haversineKm({lat,lng}, {lat:lat2, lng:lng2});
      const osmUrl = e.type && e.id ? `https://www.openstreetmap.org/${e.type}/${e.id}` : null;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat2},${lng2}`;
      return { id: `${e.type}/${e.id}`, name, address: addr, lat: lat2, lng: lng2, distanceKm: distKm, osmUrl, mapsUrl };
    })
    .filter(Boolean)
    .sort((a:any,b:any) => a.distanceKm - b.distanceKm)
    .slice(0, 10);

    return NextResponse.json({ items, center: { lat, lng }, radiusKm });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "nearby failed" }, { status: 500 });
  }
}
