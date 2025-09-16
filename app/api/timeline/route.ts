export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const iso = (ts: any) => {
  const d = new Date(ts || Date.now());
  return isNaN(+d) ? new Date().toISOString() : d.toISOString();
};

const pickObserved = (r: any) =>
  iso(
    r.report_date ??
      r.meta?.report_date ??
      r.details?.report_date ??
      r.observed_at ??
      r.observedAt ??
      r.recorded_at ??
      r.measured_at ??
      r.taken_at ??
      r.sampled_at ??
      r.timestamp ??
      r.created_at ??
      r.createdAt ??
      r.meta?.observed_at ??
      r.details?.observed_at
  );

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ items: [] }, { headers: noStore });

  const supa = supabaseAdmin();

  // Fetch predictions + observations for this user
  const [predRes, obsRes] = await Promise.all([
    supa.from("predictions").select("*").eq("user_id", userId),
    // ⬇️ REMOVED the committed filter so all rows show up
    supa.from("observations").select("*").eq("user_id", userId),
  ]);

  if (predRes.error)
    return NextResponse.json(
      { error: predRes.error.message },
      { status: 500, headers: noStore }
    );
  if (obsRes.error)
    return NextResponse.json(
      { error: obsRes.error.message },
      { status: 500, headers: noStore }
    );

  const preds = (predRes.data || []).map((r: any) => {
    const d = r.details ?? r.meta ?? {};
    const name =
      r.name ??
      r.label ??
      r.finding ??
      r.type ??
      d?.analyte ??
      d?.test_name ??
      d?.label ??
      d?.name ??
      d?.task ??
      "Prediction";
    const prob =
      typeof r.probability === "number"
        ? r.probability
        : typeof d?.fractured === "number"
        ? d.fractured
        : typeof d?.probability === "number"
        ? d.probability
        : null;
    return {
      id: String(r.id),
      kind: "prediction",
      name,
      probability: prob,
      observed_at: pickObserved(r),
      uploaded_at: iso(r.created_at ?? r.createdAt),
      meta: d || {},
      file: null,
    };
  });

  const obs = (obsRes.data || []).map((r: any) => {
    const m = r.meta ?? r.details ?? {};
    if (!m.summary) {
      m.summary = buildShortSummaryFromText(m.text, m.summary_long);
    }
    const name =
      r.name ??
      r.metric ??
      r.test ??
      m?.analyte ??
      m?.test_name ??
      m?.label ??
      "Observation";
    const value = r.value ?? m?.value ?? null;
    const unit = r.unit ?? m?.unit ?? null;
    const flags = Array.isArray(r.flags)
      ? r.flags
      : Array.isArray(m?.flags)
      ? m.flags
      : null;
    const file = {
      upload_id: r.source_upload_id ?? r.upload_id ?? m?.upload_id ?? null,
      bucket: m?.bucket ?? null,
      path: m?.storage_path ?? m?.path ?? null,
      name: m?.file_name ?? m?.name ?? null,
      mime: m?.mime ?? null,
    };
    return {
      id: String(r.id),
      kind: "observation",
      name,
      value,
      unit,
      flags,
      observed_at: pickObserved(r),
      uploaded_at: iso(r.created_at ?? r.createdAt),
      meta: m || {},
      file,
    };
  });

  // Deduplicate
  const dedup = new Map<string, any>();
  for (const it of [...preds, ...obs]) {
    const key =
      it.file?.upload_id ||
      it.meta?.source_hash ||
      `${it.name}|${it.observed_at}|${"value" in it ? it.value ?? "" : ""}`;
    if (!dedup.has(key)) dedup.set(key, it);
  }

  const items = Array.from(dedup.values()).sort(
    (a, b) =>
      new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );

  return NextResponse.json({ items }, { headers: noStore });
}
