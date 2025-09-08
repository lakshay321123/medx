import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(q)}`, { cache:"no-store" });
  if (!r.ok) return NextResponse.json({ ok:false, error:r.statusText }, { status:r.status });
  return NextResponse.json({ ok:true, data: await r.json() });
}
