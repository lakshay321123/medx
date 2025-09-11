export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { buildOverpassQuery, callOverpass } from "@/lib/nearby/overpass";
import { mapOverpassElements } from "@/lib/nearby/normalize";
import type { NearbyResponse } from "@/lib/nearby/types";

const ON = (k: string) => (process.env[k] || "").toLowerCase() === "true";
const featureOn = () => ON("FEATURE_NEARBY");

const DEF_RADIUS = Number(process.env.NEARBY_DEFAULT_RADIUS_KM || 5);
const MAX_RESULTS = Number(process.env.NEARBY_MAX_RESULTS || 40);

function clamp(n: number, min: number, max: number) {
  return isNaN(n) ? min : Math.max(min, Math.min(max, n));
}

export async function GET(req: NextRequest) {
  if (!featureOn()) return NextResponse.json({ error: "disabled" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = clamp(Number(searchParams.get("radius_km") || DEF_RADIUS), 1, 20);
  const limit = clamp(Number(searchParams.get("limit") || MAX_RESULTS), 1, MAX_RESULTS);

  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: "coords_required" }, { status: 400 });
  }

  const rM = radiusKm * 1000;
  try {
    const [labData, clinicData] = await Promise.all([
      callOverpass(buildOverpassQuery(lat, lng, rM, "lab")),
      callOverpass(buildOverpassQuery(lat, lng, rM, "clinic", "radiology|imaging")),
    ]);

    const items = [
      ...mapOverpassElements(Array.isArray(labData?.elements) ? labData.elements : [], { lat, lng }, "lab"),
      ...mapOverpassElements(Array.isArray(clinicData?.elements) ? clinicData.elements : [], { lat, lng }, "clinic"),
    ];

    items.sort((a, b) => a.distance_km - b.distance_km);
    const sliced = items.slice(0, limit);
    const payload: NearbyResponse = {
      meta: { provider: "overpass", radius_km: radiusKm, total: sliced.length, cached: false },
      items: sliced,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "overpass_error" }, { status: 502 });
  }
}

