export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getMedicationSummary } from "@/lib/meds/summary";

const ENABLED = (process.env.MEDS_FLOW_ENABLED || "").toLowerCase() === "true";
const DEFAULT_REGION = process.env.DEFAULT_REGION || "US";

export async function GET(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const name = String(searchParams.get("name") || "").trim();
  const country = searchParams.get("country") || DEFAULT_REGION;
  const lang = searchParams.get("lang") || "en";
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  try {
    const data = await getMedicationSummary({ name, country, lang });
    console.log("meds_summary", { name, country, refs: data.card.references.length });
    return NextResponse.json(data);
  } catch (e: any) {
    const msg = e?.message === "normalize_failed" ? "normalize_failed" : e?.message || "error";
    const status = msg === "normalize_failed" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
