import { NextResponse } from "next/server";
import { byCode2 } from "@/data/countries";

const DEFAULT_HEADERS = {
  "User-Agent": "MedX/1.0 (geoip) support@medx.local",
};

async function lookupByIp(ip?: string | null) {
  const endpoint = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";
  const res = await fetch(endpoint, {
    headers: DEFAULT_HEADERS,
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { country_code?: string };
  if (!data?.country_code) return null;
  return data.country_code.toUpperCase();
}

export async function GET(req: Request) {
  const headers = req.headers;
  const headerCountry =
    headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || headers.get("x-appengine-country");

  let countryCode2 = headerCountry?.toUpperCase() || null;

  if (!countryCode2) {
    const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    try {
      countryCode2 = await lookupByIp(forwarded);
    } catch (err) {
      console.error("geoip lookup failed", err);
    }
  }

  const match = countryCode2 ? byCode2(countryCode2) : undefined;

  return NextResponse.json({ country: match ?? null });
}
