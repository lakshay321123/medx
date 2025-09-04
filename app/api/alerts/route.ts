export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "open").toLowerCase();

  const { data, error } = await supabaseAdmin()
    .from("alerts")
    .select("id, severity, title, created_at, status")
    .eq("user_id", userId)
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = (data ?? []).map(r => ({
    id: r.id,
    severity: r.severity,
    title: r.title,
    createdAt: r.created_at,
    status: r.status,
  }));
  return NextResponse.json(out);
}
