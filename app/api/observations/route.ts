import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
const TEST_USER = process.env.MEDX_TEST_USER_ID!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const threadId = url.searchParams.get("threadId") || undefined;
  const sb = supabaseAdmin();
  let q = sb
    .from("observations")
    .select("*")
    .eq("user_id", TEST_USER)
    .order("observed_at", { ascending: false })
    .limit(50);
  if (threadId) q = q.eq("thread_id", threadId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ observations: data });
}

export async function POST(req: Request) {
  const body = await req.json(); // {thread_id, kind, value_num/value_text, unit, observed_at, source, raw}
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("observations")
    .insert({ user_id: TEST_USER, ...body })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ observation: data });
}

