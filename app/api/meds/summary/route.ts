export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

const ENABLED = (process.env.MEDS_FLOW_ENABLED || "").toLowerCase() === "true";
const DEFAULT_REGION = process.env.DEFAULT_REGION || "US";
const STABLE = (process.env.API_STABLE_CONTRACTS || "").toLowerCase() === "true";
const VERSION = process.env.API_CONTRACT_VERSION || "v1";
const SOURCE_VERSION = process.env.MEDS_SOURCE_VERSION || null;

export async function GET(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") || "").trim();
  const country = searchParams.get("country") || DEFAULT_REGION;
  const lang = searchParams.get("lang") || "en";
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  // Lazy import to keep heavy deps out of the serverless bundle
  const { getMedicationSummary } = await import("@/lib/meds/summary");

  try {
    const data = await getMedicationSummary({ name, country, lang });
    if (STABLE) {
      data.meta = {
        version: VERSION,
        sourceVersion: SOURCE_VERSION,
        slug: data.meta?.slug ?? null,
        country: data.meta?.country ?? null,
        cached: data.meta?.cached ?? null,
      };
    }
    return NextResponse.json(data);
  } catch (e: any) {
    const msg = e?.message === "normalize_failed" ? "normalize_failed" : e?.message || "error";
    const status = msg === "normalize_failed" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
