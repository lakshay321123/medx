import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "open").toLowerCase();

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("alerts")
    .select("id, severity, title, created_at, status")
    .eq("user_id", userId)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map to UI shape expected by AlertsPane.tsx
  const out = (data ?? []).map((r) => ({
    id: r.id,
    severity: r.severity,
    title: r.title,
    createdAt: r.created_at,
    status: r.status,
  }));

  return NextResponse.json(out);
}
