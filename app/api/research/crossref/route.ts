import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { searchCrossref } from "@/lib/crossref";

export async function GET(req: NextRequest) {
  if (!flags.enableCrossref) return NextResponse.json({ disabled: true });
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const works = await searchCrossref(q, 10);
  return NextResponse.json({ works });
}
