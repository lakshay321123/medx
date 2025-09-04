import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
const TEST_USER = process.env.MEDX_TEST_USER_ID!;

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("alerts")
    .update({ status: "acknowledged", ack_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", TEST_USER)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data });
}

