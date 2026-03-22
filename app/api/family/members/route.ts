import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const familyId = url.searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("family_members")
    .select("*")
    .eq("family_id", familyId)
    .eq("invite_status", "active")
    .order("created_at");

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { familyId, displayName, relationship, dob, sex, bloodGroup } = body;
  if (!familyId || !displayName || !relationship) {
    return NextResponse.json({ error: "familyId, displayName, relationship required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Create a patient record for the dependent
  const { data: patient } = await db
    .from("patients")
    .insert({ dob: dob ?? null, sex: sex ?? null, blood_group: bloodGroup ?? null })
    .select()
    .single();

  const { data: member, error } = await db
    .from("family_members")
    .insert({
      family_id: familyId,
      display_name: displayName,
      relationship,
      dob: dob ?? null,
      sex: sex ?? null,
      blood_group: bloodGroup ?? null,
      patient_id: patient?.id ?? null,
      role: "member",
      invite_status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, member });
}
