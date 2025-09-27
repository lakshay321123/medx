export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const manualKind = url.searchParams.get("manualKind")?.trim();
  if (!manualKind) {
    return NextResponse.json({ error: "manualKind required" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("observations")
    .select(
      "id, kind, value_text, value_num, unit, observed_at, meta, file_path, file_bucket, upload_id",
    )
    .eq("user_id", userId)
    .eq("kind", "note")
    .filter("meta->>manualKind", "eq", manualKind)
    .order("observed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}
