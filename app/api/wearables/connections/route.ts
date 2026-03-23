export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin()
    .from("wearable_connections")
    .select("provider, status, last_sync_at, created_at")
    .eq("user_id", userId);

  return NextResponse.json({ connections: data || [] });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = new URL(req.url).searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  await supabaseAdmin().from("wearable_connections").delete().eq("user_id", userId).eq("provider", provider);
  return NextResponse.json({ ok: true });
}
