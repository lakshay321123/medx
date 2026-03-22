import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  // Get families where user is owner or member
  const { data: owned } = await db.from("families").select("*").eq("owner_id", userId);
  const { data: memberOf } = await db
    .from("family_members")
    .select("family_id, families(*)")
    .eq("user_id", userId)
    .eq("invite_status", "active");

  const families = [
    ...(owned ?? []),
    ...(memberOf ?? []).map((m: any) => m.families).filter(Boolean),
  ];
  // Dedupe by id
  const seen = new Set<string>();
  const unique = families.filter((f) => { if (seen.has(f.id)) return false; seen.add(f.id); return true; });

  return NextResponse.json(unique);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId, name } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: family, error } = await db
    .from("families")
    .insert({ owner_id: userId, name: name || "My Family" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-add owner as "self" member
  await db.from("family_members").insert({
    family_id: family.id,
    user_id: userId,
    display_name: "Me",
    relationship: "self",
    role: "admin",
    invite_status: "active",
  });

  return NextResponse.json({ ok: true, family });
}
