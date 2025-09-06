import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function POST(req: NextRequest) {
  if (!flags.enableOpenTargets) return NextResponse.json({ disabled: true });
  let body: any;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const query = body?.query;
  const variables = body?.variables || {};
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const r = await fetch("https://api.platform.opentargets.org/api/v4/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();
  return NextResponse.json(j);
}
