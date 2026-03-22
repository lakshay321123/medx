import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { familyId, displayName, relationship } = body;
  if (!familyId || !displayName) {
    return NextResponse.json({ error: "familyId, displayName required" }, { status: 400 });
  }

  const token = nanoid(24);
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("family_members")
    .insert({
      family_id: familyId,
      display_name: displayName,
      relationship: relationship || "other",
      role: "member",
      invite_status: "pending",
      invite_token: token,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const inviteUrl = `${new URL(req.url).origin}/family/join?token=${token}`;
  return NextResponse.json({ ok: true, inviteUrl, token });
}

// Accept invite
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { token, userId } = body;
  if (!token || !userId) return NextResponse.json({ error: "token, userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: member, error } = await db
    .from("family_members")
    .update({ user_id: userId, invite_status: "active", invite_token: null })
    .eq("invite_token", token)
    .eq("invite_status", "pending")
    .select()
    .single();

  if (error || !member) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  return NextResponse.json({ ok: true, member });
}
