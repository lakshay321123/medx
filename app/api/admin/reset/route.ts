export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

type Scope = "observations" | "all";
type Mode = "clear" | "zero";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { scope, mode, threadId } = await req
    .json()
    .catch(() => ({}) as { scope?: Scope; mode?: Mode; threadId?: string | null });
  const sb = supabaseAdmin();

  // 1) clear observations (optionally per threadId)
  if (scope === "observations" || scope === "all") {
    let q = sb.from("observations").delete().eq("user_id", userId);
    if (threadId) q = q.eq("thread_id", threadId);
    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2) optionally zero-out demo values (re-insert zeros)
  if (mode === "zero") {
    const now = new Date().toISOString();
    const demo = [
      { kind: "bp", value_text: "0/0", unit: null },
      { kind: "hr", value_num: 0, unit: "bpm" },
      { kind: "bmi", value_num: 0, unit: "kg/m²" },
      { kind: "hba1c", value_num: 0, unit: "%" },
      { kind: "fasting_glucose", value_num: 0, unit: "mg/dL" },
      { kind: "egfr", value_num: 0, unit: "mL/min/1.73m²" },
    ].map((x) => ({
      user_id: userId,
      thread_id: threadId ?? null,
      kind: x.kind,
      value_num: (x as any).value_num ?? null,
      value_text: (x as any).value_text ?? null,
      unit: x.unit ?? null,
      observed_at: now,
      meta: { source_type: "reset" },
    }));

    const { error } = await sb.from("observations").insert(demo);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3) if scope = all, clear predictions + alerts too
  if (scope === "all") {
    const p = await sb.from("predictions").delete().eq("user_id", userId);
    if (p.error) return NextResponse.json({ error: p.error.message }, { status: 500 });
    const a = await sb.from("alerts").delete().eq("user_id", userId);
    if (a.error) return NextResponse.json({ error: a.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

