import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
const TEST_USER = process.env.MEDX_TEST_USER_ID!;

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("profiles").select("*").eq("id", TEST_USER).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("profiles").upsert({ id: TEST_USER, ...body }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

