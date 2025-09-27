export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

type InObs = {
  kind: string;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  observed_at?: string | null; // ISO
  thread_id?: string | null;
  meta?: any; // jsonb
};

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const list: InObs[] = Array.isArray(payload?.observations)
    ? payload.observations
    : Array.isArray(payload?.items)
    ? payload.items
    : [];

  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ error: "observations[] required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const rows = list.map(x => {
    const name = String(x?.value_text ?? x?.kind ?? "Observation");
    const hasNumericValue = x?.unit && x?.value_num != null;
    const simple = hasNumericValue ? `${name} — ${x.value_num} ${x.unit}` : name;
    const meta = { ...(x?.meta ?? {}) };
    if (!meta.summary) meta.summary = simple;
    if (!meta.text) meta.text = simple;
    meta.source = meta.source ?? "bulk";

    return {
      user_id: userId,
      kind: typeof x?.kind === "string" ? x.kind.toLowerCase() : "observation",
      value_num: x?.value_num ?? null,
      value_text: x?.value_text ?? null,
      unit: x?.unit ?? null,
      observed_at: x?.observed_at ?? now,
      thread_id: x?.thread_id ?? null,
      meta,
    };
  });

  const { data, error } = await supabaseAdmin()
    .from("observations")
    .insert(rows)
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, observations: data ?? [] });
}
