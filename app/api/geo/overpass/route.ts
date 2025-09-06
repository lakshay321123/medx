import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function POST(req: NextRequest) {
  if (!flags.enableOverpass) return NextResponse.json({ disabled: true });
  const body = await req.text();
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });

  const r = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body,
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();
  const elements = (j.elements || []).slice(0, 20);
  return NextResponse.json({ elements });
}
