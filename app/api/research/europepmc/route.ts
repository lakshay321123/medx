import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { searchEuropePMC } from "@/lib/europepmc";

export async function GET(req: NextRequest) {
  if (!flags.enableEuropePMC) return NextResponse.json({ disabled: true });
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const works = await searchEuropePMC(q, 10);
  return NextResponse.json({ works });
}
