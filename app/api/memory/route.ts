import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const thread_id = searchParams.get("thread_id");
  const supabase = createClient();
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
  const body = await req.json();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = Array.isArray(body) ? body : [body];
  const rows = payload.map((m: any) => ({
    user_id: user.id,
    scope: m.scope ?? "global",
    thread_id: m.thread_id ?? null,
    key: m.key,
    value: m.value,
    source: m.source ?? "manual",
    confidence: m.confidence ?? 0.8,
  }));

  const { data, error } = await supabase.from("medx_memory")
    .upsert(rows, { onConflict: "user_id,scope,thread_id,key" })
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const { error } = await supabase.from("medx_memory")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
