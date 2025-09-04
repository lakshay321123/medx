import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
const TEST_USER = process.env.MEDX_TEST_USER_ID!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const threadId = url.searchParams.get("threadId") || undefined;
  const sb = supabaseAdmin();
  let q = sb
    .from("predictions")
    .select("*")
    .eq("user_id", TEST_USER)
    .order("created_at", { ascending: false })
    .limit(50);
  if (threadId) q = q.eq("thread_id", threadId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ predictions: data });
}

