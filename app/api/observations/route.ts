export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const threadId = url.searchParams.get("threadId") || undefined;

  const sb = supabaseAdmin();
  let q = sb
    .from("observations")
    .select("*")
    .eq("user_id", userId)
    .order("observed_at", { ascending: false })
    .limit(50);
  if (threadId) q = q.eq("thread_id", threadId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = (data ?? []).map(r => ({
    kind: r.kind,
    value: r.value_num ?? r.value_text ?? null,
    unit: r.unit ?? null,
    observedAt: r.observed_at,
  }));
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { data, error } = await supabaseAdmin()
    .from("observations")
    .insert({ user_id: userId, ...body })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ observation: data });
}
