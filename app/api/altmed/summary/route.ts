export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getAltMedSummary } from "@/lib/altmed/summary";

const ENABLED = (process.env.ALT_MED_INFO || "").toLowerCase() === "true";

export async function GET(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const name = String(searchParams.get("name") || "").trim();
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  try {
    const data = await getAltMedSummary({ name });
    return NextResponse.json(data);
  } catch (e: any) {
    const msg = e?.message || "error";
    const status = msg === "no_whitelisted_source" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
