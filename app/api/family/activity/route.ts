import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const familyId = url.searchParams.get("familyId");
  const limit = Number(url.searchParams.get("limit") || "20");
  if (!familyId) return NextResponse.json({ error: "familyId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("family_activity")
    .select("*, family_members(display_name)")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return NextResponse.json(data ?? []);
}
