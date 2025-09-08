import { NextRequest, NextResponse } from "next/server";
import { fetchTrialByNct } from "@/lib/trials/byId";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nct = (searchParams.get("nct") || "").toUpperCase().trim();
  if (!/^NCT\d{8}$/.test(nct)) {
    return NextResponse.json({ error: "invalid_nct" }, { status: 400 });
  }
  const t = await fetchTrialByNct(nct);
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, trial: t });
}
