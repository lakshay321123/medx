export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getVaccineReminders } from "@/lib/vaccines/reminders";

const ENABLED = (process.env.VACCINE_REMINDERS || "").toLowerCase() === "true";
const DEFAULT_REGION = process.env.DEFAULT_REGION || "US";

export async function GET(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const ageStr = searchParams.get("age");
  if (!ageStr) {
    return NextResponse.json({ error: "age_required" }, { status: 400 });
  }
  const age = parseFloat(ageStr);
  if (Number.isNaN(age)) {
    return NextResponse.json({ error: "age_invalid" }, { status: 400 });
  }
  const region = searchParams.get("region") || DEFAULT_REGION;
  const risk = searchParams.get("risk");
  const history = searchParams.get("history");
  const riskFlags = risk ? risk.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const historyList = history ? history.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const data = getVaccineReminders({ age, region, riskFlags, history: historyList });
  return NextResponse.json(data);
}
