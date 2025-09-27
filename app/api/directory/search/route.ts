import { NextResponse } from "next/server";
import { searchOsmPlaces } from "@/lib/directory/osm";
import type { DirectoryPlaceType } from "@/lib/directory/types";

const FEATURE_ENABLED =
  process.env.FEATURE_DIRECTORY === "1" || process.env.NEXT_PUBLIC_FEATURE_DIRECTORY === "1";

function parseType(value: string | null): DirectoryPlaceType {
  if (value === "pharmacy" || value === "lab") return value;
  return "doctor";
}

function parseNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

export async function GET(request: Request) {
  if (!FEATURE_ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "missing_location" }, { status: 400 });
  }

  const type = parseType(searchParams.get("type"));
  const radius = parseNumber(searchParams.get("radius"), 4000);
  const query = searchParams.get("q")?.trim() || undefined;
  const minRating = parseNumber(searchParams.get("min_rating"), 0);
  const maxKmParam = searchParams.get("max_km");
  const maxKm = maxKmParam ? parseNumber(maxKmParam, 0) : 0;
  const openNow = searchParams.get("open_now") === "1";

  try {
    const results = await searchOsmPlaces({ type, lat, lng, radius, query });
    const filtered = results.filter(place => {
      if (minRating > 0 && (place.rating ?? 0) < minRating) return false;
      if (maxKm > 0 && (place.distance_m ?? Number.POSITIVE_INFINITY) > maxKm * 1000) return false;
      if (openNow && place.open_now === false) return false;
      return true;
    });

    return NextResponse.json({
      results: filtered,
      attribution: "© OpenStreetMap contributors",
      updated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "unknown_error", results: [], attribution: "© OpenStreetMap contributors" },
      { status: 502 },
    );
  }
}
