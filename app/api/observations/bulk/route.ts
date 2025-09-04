export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

type InObs = {
  kind: string;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  observed_at?: string | null;   // ISO
  thread_id?: string | null;
  meta?: any;                    // jsonb
};

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { items } = await req.json().catch(() => ({ items: [] as InObs[] }));
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items[] required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const rows = items.map((x) => ({
    user_id: userId,
    kind: x.kind.toLowerCase(),
    value_num: x.value_num ?? null,
    value_text: x.value_text ?? null,
    unit: x.unit ?? null,
    observed_at: x.observed_at ?? now,
    thread_id: x.thread_id ?? null,
    meta: x.meta ?? null,
  }));

  const { error, count } = await supabaseAdmin().from("observations").insert(rows, { count: "exact" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: count ?? rows.length });
}
