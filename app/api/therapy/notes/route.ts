import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const rawLimit = Number(searchParams.get("limit") || 3);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 5) : 3;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("therapy_notes")
      .select("summary, meta, mood, breakthrough, next_step, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sb = supabaseAdmin();
  const body = await req.json();
  const { userId, summary } = body || {};
  if (!userId || !summary) return NextResponse.json({ error: "userId & summary required" }, { status: 400 });

  const { data, error } = await sb
    .from("therapy_notes")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, note: data });
}
