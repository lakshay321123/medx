export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const threadId = url.searchParams.get("threadId");
  if (!threadId) return new NextResponse("Missing threadId", { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("predictions")
    .select("id, created_at, risk_score, band")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = (data ?? []).map(r => ({ id: r.id, createdAt: r.created_at, riskScore: r.risk_score, band: r.band }));
  return NextResponse.json(out);
}
