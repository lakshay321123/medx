export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("observations")
    .select("id, user_id, meta")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const meta = (data as any)?.meta ?? {};
  const bucket = meta?.bucket ?? meta?.file_bucket ?? null;
  const path = meta?.storage_path ?? meta?.file_path ?? meta?.path ?? null;

  if (bucket && path) {
    try {
      await sb.storage.from(bucket).remove([path]);
    } catch (err) {
      console.warn("[observations/delete] storage cleanup failed", err);
    }
  }

  const { error: delError } = await sb
    .from("observations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (delError) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
