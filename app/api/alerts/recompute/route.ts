export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST() {
  const res  = await fetch("/api/predictions/compute", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ threadId: "med-profile" })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    return NextResponse.json({ ok:false, error: json?.error || `HTTP ${res.status}` }, { status: res.status });
  }
  return NextResponse.json({ ok:true, forwarded:true });
}
