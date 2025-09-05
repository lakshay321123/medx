export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const { text, meds } = await req.json().catch(() => ({ text: "" }));
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400, headers: noStore });
  const meta: any = { kind: "note", source: "ai_doc", text, committed: true };
  if (Array.isArray(meds)) meta.meds = meds;
  const { error } = await supabaseAdmin()
    .from("observations")
    .insert({
      user_id: userId,
      observed_at: new Date().toISOString(),
      name: "Note",
      meta,
    });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
