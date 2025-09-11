export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getVaccineSummary } from "@/lib/vaccines/summary";

const ENABLED = (process.env.VACCINE_SUMMARY_ENABLED || "").toLowerCase() === "true";
const DEFAULT_REGION = process.env.DEFAULT_REGION || "US";

export async function GET(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const name = String(searchParams.get("name") || "").trim();
  const country = searchParams.get("country") || DEFAULT_REGION;
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  const data = getVaccineSummary({ name, country });
  return NextResponse.json(data);
}
