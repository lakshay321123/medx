import { NextResponse } from "next/server";
import { providerLang } from "@/lib/i18n/providerLang";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const langParam = (searchParams.get("lang") || "en").trim();
  const appLang = langParam.length > 0 ? langParam : "en";
  const normalized = providerLang(appLang);
  const acceptLanguage = Array.from(
    new Set(
      [appLang, normalized, "en"].map(value => value?.trim()).filter((value): value is string => Boolean(value)),
    ),
  ).join(", ");
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
      "Accept-Language": acceptLanguage,
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
