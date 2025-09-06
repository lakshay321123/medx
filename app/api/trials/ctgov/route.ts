import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { searchCTGov } from "@/lib/trials_ctgov";

export async function GET(req: NextRequest) {
  if (!flags.enableTrialsCTG) return NextResponse.json({ disabled: true });
  const url = new URL(req.url);
  const condition = url.searchParams.get("condition") || "";
  if (!condition) return NextResponse.json({ error: "condition required" }, { status: 400 });
  const country = url.searchParams.get("country") || undefined;
  const phase = url.searchParams.get("phase")?.split(",").map(s => s.trim()).filter(Boolean);
  const status = url.searchParams.get("status")?.split(",").map(s => s.trim()).filter(Boolean);
  const rows = await searchCTGov(condition, { country, phase, status, size: 10 });
  return NextResponse.json({ rows });
}
