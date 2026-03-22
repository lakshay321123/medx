import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const familyId = url.searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: membership } = await db.from("family_members").select("id").eq("family_id", familyId).eq("user_id", userId).eq("invite_status", "active").single();
  if (!membership) return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });

  const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);
  const { data } = await db.from("family_activity").select("*, family_members(display_name)")
    .eq("family_id", familyId).order("created_at", { ascending: false }).limit(limit);
  return NextResponse.json(data ?? []);
}
