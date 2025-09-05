export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { extractReportDate } from "@/lib/reportDate";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("observations")
    .select("*")
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  for (const r of data || []) {
    const m = r.meta || r.details || {};
    if (m.report_date) continue;
    const text = m.text || m.ocr_text || m.raw || "";
    const found = extractReportDate(text);
    if (!found) continue;
    const patch = { observed_at: found, meta: { ...m, report_date: found } };
    const upd = await supa.from("observations").update(patch).eq("id", r.id);
    if (!upd.error) updated++;
  }
  return NextResponse.json({ ok: true, updated });
}
