export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin"; // existing admin client
import { getUserId } from "@/lib/getUserId";              // same helper as /api/profile

const noStore = { "Cache-Control": "no-store, max-age=0" };

type TimelineItem = {
  id: string;
  kind: "prediction" | "observation";
  name: string;
  value?: string | number | null;
  unit?: string | null;
  probability?: number | null;
  flags?: string[] | null;
  observed_at: string; // ISO
  source_upload_id?: string | null;
  meta?: any;
};

function iso(ts: any): string {
  if (!ts) return new Date().toISOString();
  const d = new Date(ts);
  return isNaN(+d) ? new Date().toISOString() : d.toISOString();
}

// Choose a timestamp from many possible fields (schema-tolerant)
function pickTimestamp(r: any): string {
  return iso(
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
    r.details?.observed_at ??
    r.meta?.timestamp ??
    r.details?.timestamp
  );
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ items: [] }, { headers: noStore });

  const supa = supabaseAdmin();

  // Select * (no ORDER BY on unknown columns); sort in JS afterwards.
  const [predRes, obsRes] = await Promise.all([
    supa.from("predictions").select("*").eq("user_id", userId),
    supa.from("observations").select("*").eq("user_id", userId),
  ]);

  if (predRes.error) {
    return NextResponse.json({ error: predRes.error.message }, { status: 500, headers: noStore });
  }
  if (obsRes.error) {
    return NextResponse.json({ error: obsRes.error.message }, { status: 500, headers: noStore });
  }

  const preds: TimelineItem[] = (predRes.data ?? []).map((r: any) => {
    const details = r.details ?? r.meta ?? null;
    const name =
      r.name ??
      r.label ??
      r.finding ??
      r.type ??
      details?.label ??
      details?.name ??
      details?.task ??
      "Prediction";

    const probability =
      typeof r.probability === "number"
        ? r.probability
        : typeof details?.fractured === "number"
        ? details.fractured
        : typeof details?.probability === "number"
        ? details.probability
        : null;

    return {
      id: String(r.id),
      kind: "prediction",
      name,
      probability,
      observed_at: pickTimestamp(r),
      source_upload_id: r.source_upload_id ?? r.upload_id ?? null,
      meta: details,
    };
  });

  const obs: TimelineItem[] = (obsRes.data ?? []).map((r: any) => {
    const meta = r.meta ?? r.details ?? null;
    const name = r.name ?? r.metric ?? r.test ?? "Observation";
    const value = r.value ?? meta?.value ?? null;
    const unit = r.unit ?? meta?.unit ?? null;
    const flags = Array.isArray(r.flags) ? r.flags : Array.isArray(meta?.flags) ? meta.flags : null;

    return {
      id: String(r.id),
      kind: "observation",
      name,
      value,
      unit,
      flags,
      observed_at: pickTimestamp(r),
      source_upload_id: r.source_upload_id ?? r.upload_id ?? null,
      meta,
    };
  });

  const items = [...preds, ...obs].sort(
    (a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );

  return NextResponse.json({ items }, { headers: noStore });
}

