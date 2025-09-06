import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { searchSemanticScholar } from "@/lib/semanticscholar";

export async function GET(req: NextRequest) {
  if (!flags.enableSemanticScholar) return NextResponse.json({ disabled: true });
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const works = await searchSemanticScholar(q, 10);
  return NextResponse.json({ works });
}
