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
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 1000);
  const threadId = searchParams.get("threadId") || undefined;

  const sb = supabaseAdmin();
  let q = sb
    .from("observations")
    .select("kind, value_num, value_text, unit, observed_at")
    .eq("user_id", userId)
    .order("observed_at", { ascending: false })
    .limit(limit);
  if (threadId) q = q.eq("thread_id", threadId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map to UI shape expected by MedicalProfile
  const out = (data ?? []).map((r) => ({
    kind: r.kind,
    value: r.value_num ?? r.value_text ?? null,
    observedAt: r.observed_at,
    unit: r.unit ?? null,
  }));

  return NextResponse.json(out);
}
