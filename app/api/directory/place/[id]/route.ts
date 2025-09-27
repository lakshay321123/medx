import { NextResponse } from "next/server";
import { fetchOsmPlaceById } from "@/lib/directory/osm";

const FEATURE_ENABLED =
  process.env.FEATURE_DIRECTORY === "1" || process.env.NEXT_PUBLIC_FEATURE_DIRECTORY === "1";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!FEATURE_ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const place = await fetchOsmPlaceById(id);
  if (!place) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ place, attribution: "© OpenStreetMap contributors" });
}
