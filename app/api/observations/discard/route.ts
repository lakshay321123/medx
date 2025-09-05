export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("observations")
    .select("meta")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const m = data.meta || {};
  if (m.bucket && m.storage_path) {
    try {
      await sb.storage.from(m.bucket).remove([m.storage_path]);
    } catch {}
  }
  const del = await sb.from("observations").delete().eq("id", id).eq("user_id", userId);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
