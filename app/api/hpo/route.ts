import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableHPO) return NextResponse.json({ disabled: true });
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const url = `https://api.monarchinitiative.org/v3/api/search?q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();
  const terms = (j.docs || j.results || []).map((d: any) => ({
    id: d.id || d.curie || d.identifier,
    label: d.label,
    category: d.category || d.categories?.[0] || null,
  }));
  return NextResponse.json({ terms });
}
