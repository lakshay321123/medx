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
  const threadId = searchParams.get("threadId");
  if (!threadId) return new NextResponse("Missing threadId", { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("predictions")
    .select("id, created_at, risk_score, band")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map to UI shape expected by Timeline.tsx
  const out = (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    riskScore: r.risk_score,
    band: r.band,
  }));

  return NextResponse.json(out);
}
