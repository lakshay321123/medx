import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ data: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  const resp = await fetch(url.toString(), {
    headers: {
      "User-Agent": "SecondOpinion/1.0 (geocode) contact: support@secondopinion.local",
      "Accept-Language": "en",
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const rows = await resp.json();
  const data = (rows || []).map((r: any) => ({
    label: r.display_name as string,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));

  return NextResponse.json({ data });
}
