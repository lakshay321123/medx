import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function POST(req: NextRequest) {
  if (!flags.enableHPO) return NextResponse.json({ disabled: true });
  let body: any;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const text = body?.text || body?.content || "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const url = `https://api.monarchinitiative.org/v3/api/annotate?content=${encodeURIComponent(text)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();
  const terms = (j.annotations || j || []).map((a: any) => ({
    id: a.id || a.curie,
    label: a.label,
    category: a.category || a.type || null,
  }));
  return NextResponse.json({ terms });
}
