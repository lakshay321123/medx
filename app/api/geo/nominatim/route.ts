import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableNominatim) return NextResponse.json({ disabled: true });
  const params = new URL(req.url).searchParams;
  const q = params.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const limit = params.get("limit") || "5";

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", limit);

  const r = await fetch(url.toString(), {
    cache: "no-store",
    headers: { "User-Agent": "medx" },
  });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  const results = (j || []).map((x: any) => ({
    display_name: x.display_name,
    lat: x.lat,
    lon: x.lon,
  }));

  return NextResponse.json({ results });
}
