import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("trial_matches")
    .select("*")
    .eq("user_id", userId)
    .order("match_score", { ascending: false })
    .limit(20);

  return NextResponse.json(data ?? []);
}
