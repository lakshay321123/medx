import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const thread_id = searchParams.get("thread_id");

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let q = supabase.from("medx_memory").select("*").eq("user_id", user.id);
  if (scope) q = q.eq("scope", scope);
  if (thread_id) q = q.eq("thread_id", thread_id);

  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await req.json();
  const rows = (Array.isArray(payload) ? payload : [payload]).map((m: any) => ({
    user_id: user.id,
    scope: m.scope ?? "global",
    thread_id: m.thread_id ?? null,
    key: m.key,
    value: m.value,
    source: m.source ?? "manual",
    confidence: m.confidence ?? 0.8,
  }));

  const { data, error } = await supabase
    .from("medx_memory")
    .insert(rows)
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function DELETE(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { error } = await supabase
    .from("medx_memory")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
