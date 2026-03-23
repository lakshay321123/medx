export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("consents")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data?.consents?.notifications || {} });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  
  // Save notification preferences to profiles.consents.notifications
  const { data: current } = await supabaseAdmin()
    .from("profiles")
    .select("consents")
    .eq("id", userId)
    .single();

  const consents = current?.consents || {};
  consents.notifications = body;

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ consents })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
