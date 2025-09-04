import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
const TEST_USER = process.env.MEDX_TEST_USER_ID!;

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("alerts")
    .select("*")
    .eq("user_id", TEST_USER)
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data });
}

