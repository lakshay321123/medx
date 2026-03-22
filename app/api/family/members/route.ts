import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = new URL(req.url).searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: membership } = await db.from("family_members").select("id").eq("family_id", familyId).eq("user_id", userId).eq("invite_status", "active").single();
  if (!membership) return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });

  const { data } = await db.from("family_members").select("*").eq("family_id", familyId).eq("invite_status", "active").order("created_at");
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { familyId, displayName, relationship, dob, sex, bloodGroup } = body;
  if (!familyId || !displayName || !relationship) return NextResponse.json({ error: "familyId, displayName, relationship required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: admin } = await db.from("families").select("id").eq("id", familyId).eq("owner_id", userId).single();
  if (!admin) return NextResponse.json({ error: "Only family admin can add members" }, { status: 403 });

  const { data: patient } = await db.from("patients").insert({ owner_user_id: userId, dob: dob ?? null, sex: sex ?? null, blood_group: bloodGroup ?? null }).select().single();
  const { data: member, error } = await db.from("family_members").insert({
    family_id: familyId, display_name: displayName, relationship,
    dob: dob ?? null, sex: sex ?? null, blood_group: bloodGroup ?? null,
    patient_id: patient?.id ?? null, role: "member", invite_status: "active",
  }).select().single();

  if (error) { console.error("[family/members]:", error); return NextResponse.json({ error: "Could not add member." }, { status: 500 }); }
  return NextResponse.json({ ok: true, member });
}
