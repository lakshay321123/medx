import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { searchISRCTN } from "@/lib/trials_extras";

export async function GET(req: NextRequest) {
  if (!flags.enableTrialsISRCTN) return NextResponse.json({ disabled: true });
  const condition = new URL(req.url).searchParams.get("condition") || "";
  if (!condition) return NextResponse.json({ error: "condition required" }, { status: 400 });
  const rows = await searchISRCTN(condition);
  return NextResponse.json({ rows });
}
