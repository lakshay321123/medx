export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("profiles").select("id").limit(1);
    return NextResponse.json({
      ok: !error,
      env: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      dbPing: error ? error.message : "ok",
      sample: data?.length || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
