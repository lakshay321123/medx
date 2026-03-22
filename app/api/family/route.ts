import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const [{ data: owned }, { data: memberOf }] = await Promise.all([
    db.from("families").select("*").eq("owner_id", userId),
    db.from("family_members").select("family_id, families(*)").eq("user_id", userId).eq("invite_status", "active"),
  ]);

  const seen = new Set<string>();
  const families = [
    ...(owned ?? []),
    ...(memberOf ?? []).map((m: Record<string, unknown>) => m.families).filter(Boolean),
  ].filter((f: Record<string, unknown>) => { const id = f.id as string; if (seen.has(id)) return false; seen.add(id); return true; });

  return NextResponse.json(families);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  const { data: family, error } = await db.from("families").insert({ owner_id: userId, name: body.name || "My Family" }).select().single();
  if (error) { console.error("[family] create:", error); return NextResponse.json({ error: "Could not create family." }, { status: 500 }); }

  await db.from("family_members").insert({
    family_id: family.id, user_id: userId, display_name: "Me",
    relationship: "self", role: "admin", invite_status: "active",
  });
  return NextResponse.json({ ok: true, family });
}
