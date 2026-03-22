import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { familyId, displayName, relationship } = body;
  if (!familyId || !displayName) return NextResponse.json({ error: "familyId, displayName required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: fam } = await db.from("families").select("id").eq("id", familyId).eq("owner_id", userId).single();
  if (!fam) return NextResponse.json({ error: "Only family admin can invite" }, { status: 403 });

  const token = nanoid(24);
  const { error } = await db.from("family_members").insert({
    family_id: familyId, display_name: displayName, relationship: relationship || "other",
    role: "member", invite_status: "pending", invite_token: token,
  });
  if (error) { console.error("[family/invite]:", error); return NextResponse.json({ error: "Could not create invite." }, { status: 500 }); }
  return NextResponse.json({ ok: true, inviteUrl: `${new URL(req.url).origin}/family/join?token=${token}`, token });
}

export async function PUT(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: member, error } = await db.from("family_members")
    .update({ user_id: userId, invite_status: "active", invite_token: null })
    .eq("invite_token", body.token).eq("invite_status", "pending").select().single();
  if (error || !member) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  return NextResponse.json({ ok: true, member });
}
