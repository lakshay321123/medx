export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const ENABLED = String(process.env.SYMPTOM_TRACKER || "").toLowerCase() === "true";
const noStore = { "Cache-Control": "no-store, max-age=0" };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function POST(req: NextRequest) {
  if (!ENABLED)
    return NextResponse.json({ error: "Symptom tracker disabled" }, { status: 404 });
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const name = slug(String(body.name || ""));
  const severity = Math.round(Number(body.severity));
  const note = body.note ? String(body.note) : null;
  let ts = new Date(body.ts || Date.now());
  if (isNaN(+ts)) ts = new Date();

  if (!name || severity < 0 || severity > 10)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const supa = supabaseAdmin();
  const { error } = await supa
    .from("symptom_logs")
    .upsert(
      { user_id: userId, name, severity, note, ts: ts.toISOString() },
      { onConflict: "user_id,ts,name" }
    );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: noStore });
}

export async function GET(req: NextRequest) {
  if (!ENABLED)
    return NextResponse.json({ error: "Symptom tracker disabled" }, { status: 404 });
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json(
      { name: "", series: [], meta: { n: 0, range_days: 0 } },
      { headers: noStore }
    );
  const { searchParams } = new URL(req.url);
  const name = slug(String(searchParams.get("name") || ""));
  let from = new Date(searchParams.get("from") || Date.now() - 30 * 864e5);
  let to = new Date(searchParams.get("to") || Date.now());
  if (isNaN(+from)) from = new Date(Date.now() - 30 * 864e5);
  if (isNaN(+to)) to = new Date();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("symptom_logs")
    .select("ts,severity")
    .eq("user_id", userId)
    .eq("name", name)
    .gte("ts", from.toISOString())
    .lte("ts", to.toISOString())
    .order("ts");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const series = (data || []).map((r: any) => ({ ts: r.ts, severity: r.severity }));
  const n = series.length;
  const range_days = Math.round((to.getTime() - from.getTime()) / 864e5);
  console.log(JSON.stringify({ user_id: userId, name, n }));
  return NextResponse.json(
    { name, series, meta: { n, range_days } },
    { headers: noStore }
  );
}
