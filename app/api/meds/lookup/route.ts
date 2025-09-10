import { NextResponse } from "next/server";
import index from "@/data/meds/index.json";
import { formatRecommendation } from "@/lib/rec/format";

function readMed(slug: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`@/data/meds/${slug}.json`);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const country = (searchParams.get("country") || "IN").toUpperCase();
  if (!q) return NextResponse.json({ results: [] });

  const candidates = Object.keys(index).filter((slug) =>
    slug.includes(q)
  );
  const mats = candidates.slice(0, 10).map(readMed).map((m: any) => {
    const rule = (m.country_rules || {})[country] || {};
    const is_otc = rule.is_otc ?? m.is_otc;
    const requires_prescription = rule.requires_prescription ?? m.requires_prescription;
    return formatRecommendation({ ...m, is_otc, requires_prescription });
  });
  return NextResponse.json({ results: mats });
}
