export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

const ENABLED = (process.env.MEDS_FLOW_ENABLED || "").toLowerCase() === "true";
const STABLE = (process.env.API_STABLE_CONTRACTS || "").toLowerCase() === "true";
const VERSION = process.env.API_CONTRACT_VERSION || "v1";
const SOURCE_VERSION = process.env.MEDS_SOURCE_VERSION || null;

export async function GET(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").trim();
  const countryParam = (searchParams.get("country") || "").trim();
  const country = countryParam || undefined;
  if (!q) {
    return NextResponse.json({ error: "q_required" }, { status: 400 });
  }
  try {
    const url = new URL("https://rxnav.nlm.nih.gov/REST/approximateTerm.json");
    url.searchParams.set("term", q);
    url.searchParams.set("maxEntries", "5");
    if (country) {
      url.searchParams.set("country", country);
    }
    const r = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    let meds: { name: string | null; rxnormId: string | null; score: number | null }[] = [];
    if (r.ok) {
      const j = await r.json();
      meds = (j?.approximateGroup?.candidate || []).map((c: any) => ({
        name: c?.candidate || null,
        rxnormId: c?.rxcui || null,
        score: c?.score !== undefined ? Number(c.score) : null,
      }));
    }
    const resp: any = { meds };
    if (STABLE) {
      resp.meta = {
        version: VERSION,
        sourceVersion: SOURCE_VERSION,
        slug: null,
        country: country ?? null,
        cached: false,
      };
    }
    return NextResponse.json(resp);
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
