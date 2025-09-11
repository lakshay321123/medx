export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { buildOverpassQuery, callOverpass } from "@/lib/nearby/overpass";
import { mapOverpassElements } from "@/lib/nearby/normalize";
import type { NearbyType, NearbyResponse } from "@/lib/nearby/types";

const ON = (k: string) => (process.env[k] || "").toLowerCase() === "true";
const FEATURE = ON("FEATURE_NEARBY");

const DEF_RADIUS = Number(process.env.NEARBY_DEFAULT_RADIUS_KM || 5);
const MAX_RESULTS = Number(process.env.NEARBY_MAX_RESULTS || 40);
const TTL = Number(process.env.NEARBY_CACHE_TTL_SEC || 300);

function clamp(n: number, min: number, max: number) {
  return isNaN(n) ? min : Math.max(min, Math.min(max, n));
}

export async function GET(req: NextRequest) {
  if (!FEATURE) return NextResponse.json({ error: "disabled" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "doctor") as NearbyType;
  const specialty = (searchParams.get("specialty") || "").trim();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = clamp(Number(searchParams.get("radius_km") || DEF_RADIUS), 1, 20);
  const limit = clamp(Number(searchParams.get("limit") || MAX_RESULTS), 1, MAX_RESULTS);

  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: "coords_required" }, { status: 400 });
  }

  const key = `nearby:${type}:${specialty}:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}`;
  // const cached = await kv.get<NearbyResponse>(key);
  // if (cached) return NextResponse.json({ ...cached, meta: { ...cached.meta, cached: true } });

  const q = buildOverpassQuery(lat, lng, radiusKm * 1000, type, specialty);
  let data;
  try {
    data = await callOverpass(q);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "overpass_error" }, { status: 502 });
  }

  const elements = Array.isArray(data?.elements) ? data.elements : [];
  let items = mapOverpassElements(elements, { lat, lng }, type);

  if (type === "specialist" && specialty) {
    const rx = new RegExp(`(^|;)\\s*${specialty}\\s*($|;)`, "i");
    items = items.filter((i) => rx.test(i.specialty || ""));
  }

  items.sort((a, b) => a.distance_km - b.distance_km);
  items = items.slice(0, limit);

  const payload: NearbyResponse = {
    meta: { provider: "overpass", radius_km: radiusKm, total: items.length, cached: false },
    items,
  };

  // await kv.set(key, payload, { ex: TTL });
  return NextResponse.json(payload, { status: 200 });
}
