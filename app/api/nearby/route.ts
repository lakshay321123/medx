import { NextResponse } from "next/server";

type Body = {
  lat: number;
  lng: number;
  radiusKm?: number;
  specialtyQuery?: string;
};

const BASE_SELECTORS = [
  'amenity="doctors"',
  'healthcare="doctor"',
  'amenity="clinic"',
  'amenity="hospital"',
  'healthcare="hospital"',
  'healthcare="laboratory"',
  'amenity="pharmacy"',
  'healthcare="dentist"',
  'amenity="dentist"',
  'healthcare="physiotherapist"',
  'healthcare="optometrist"',
  'shop="optician"',
  'healthcare="alternative"',
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
  const v = cands.find(Boolean);
  return v ? String(v).split(";")[0].trim() : null;
}

function tidyName(raw?: string): string {
  if (!raw) return "(Unnamed)";
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([A-Za-z][a-z']*)\b/g, m => m[0].toUpperCase() + m.slice(1));
}

function normalizeTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s+&\/\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
}

const SYNONYMS: Record<string, string[]> = {
  gyn: ["gyn", "gyno", "gyne", "gynaec", "gynecologist", "gynaecologist", "obgyn", "ob-gyn", "obstetric", "maternity", "women"],
  cardio: ["cardio", "cardiology", "cardiologist", "heart", "cardiovascular", "ctvs", "cardiothoracic"],
  neuro: ["neuro", "neurology", "neurologist", "nerve", "brain", "stroke", "epilepsy"],
  ortho: ["ortho", "orthopedic", "orthopaedic", "bone", "joint", "spine"],
  derma: ["derma", "derm", "dermatology", "dermatologist", "skin"],
  ent: ["ent", "otolaryngology", "ear", "nose", "throat"],
  uro: ["uro", "urology", "urologist", "kidney", "andrology"],
  onco: ["onco", "oncology", "oncologist", "cancer", "chemotherapy", "radiation oncology"],
  ped: ["ped", "pediatrics", "paediatrics", "child"],
  endo: ["endo", "endocrinology", "endocrinologist", "diabetes", "thyroid"],
  gastro: ["gastro", "gastroenterology", "hepatology", "liver", "gi"],
  psych: ["psych", "psychiatry", "psychiatrist", "mental health"],
  physio: ["physio", "physiotherapy", "physiotherapist", "rehab"],
  chiro: ["chiro", "chiropractor", "chiropractic"],
  ivf: ["ivf", "fertility", "reproductive", "ivf centre", "ivf center", "iui", "icsi"],
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesAnyField(item: any, rxList: RegExp[]): boolean {
  const fields = [
    item.name || "",
    item.tags?.["healthcare:speciality"] || "",
    item.tags?.speciality || "",
    item.tags?.description || "",
    item.tags?.department || "",
    item.tags?.["medical_specialty"] || "",
  ]
    .join(" | ")
    .toLowerCase();
  return rxList.every(rx => rx.test(fields));
}

function dedupe(items: any[]) {
  const out: any[] = [];
  for (const it of items) {
    const dup = out.find(o =>
      o.name.toLowerCase() === it.name.toLowerCase() &&
      Math.abs(o.lat - it.lat) < 0.001 &&
      Math.abs(o.lng - it.lng) < 0.001
    );
    if (!dup) out.push(it);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { lat, lng, radiusKm = 5, specialtyQuery } = (await req.json()) as Body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const radiusM = Math.round(radiusKm * 1000);
    const around = `around:${radiusM},${lat},${lng}`;
    const union = BASE_SELECTORS.map(sel => `
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
      return NextResponse.json({ error: `Overpass error ${res.status}: ${txt.slice(0, 200)}` }, { status: 502 });
    }

    const json = await res.json();
    const elements = Array.isArray(json?.elements) ? json.elements : [];

    let items = elements
      .map((e: any) => {
        const center = e.center || (e.lat && e.lon ? { lat: e.lat, lon: e.lon } : null);
        if (!center) return null;
        const name = tidyName(e.tags?.name);
        const address = buildAddress(e.tags);
        const phone = pickPhone(e.tags);
        const lat2 = center.lat, lng2 = center.lon;
        const distanceKm = haversineKm({ lat, lng }, { lat: lat2, lng: lng2 });
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat2},${lng2}`;
        return { id: `${e.type}/${e.id}`, name, address, phone, lat: lat2, lng: lng2, distanceKm, mapsUrl, tags: e.tags || {} };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    if (specialtyQuery) {
      const tokens = normalizeTokens(specialtyQuery);
      const rxList = tokens.map(t => {
        const synKey = Object.keys(SYNONYMS).find(k => t.startsWith(k) || k.startsWith(t));
        const syns = synKey ? SYNONYMS[synKey] : [];
        const opts = [t, ...syns].map(escapeRegExp).join("|");
        return new RegExp(`\b(${opts})\b`, "i");
      });
      const filtered = items.filter(it => matchesAnyField(it, rxList));
      if (filtered.length) items = filtered;
    }

    items = dedupe(items);
    const named = items.filter((x: any) => x.name !== "(Unnamed)");
    const unnamed = items.filter((x: any) => x.name === "(Unnamed)").slice(0, 2);
    items = [...named, ...unnamed].slice(0, 10);

    const itemsOut = items.map(({ tags, ...rest }) => rest);

    return NextResponse.json({ items: itemsOut, center: { lat, lng }, radiusKm });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "nearby failed" }, { status: 500 });
  }
}

