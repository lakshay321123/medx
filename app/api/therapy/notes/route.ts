import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("therapy_notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data || null });
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
