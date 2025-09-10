import { NextResponse } from "next/server";
import index from "@/data/meds/index.json";
import { formatRecommendation } from "@/lib/rec/format";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") || "").toLowerCase().trim();
  const country = (searchParams.get("country") || "IN").toUpperCase();
  if (!name) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const slug = Object.keys(index).find((s) => s === name);
  if (!slug) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require(`@/data/meds/${slug}.json`);
  const rule = (m.country_rules || {})[country] || {};
  const is_otc = rule.is_otc ?? m.is_otc;
  const requires_prescription = rule.requires_prescription ?? m.requires_prescription;
  const pkg = formatRecommendation({ ...m, is_otc, requires_prescription });

  return NextResponse.json({ ok: true, data: pkg });
}
