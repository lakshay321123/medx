export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ items: [] }, { headers: noStore });

  const supa = supabaseAdmin();

  const [predRes, obsRes] = await Promise.all([
    // Select * to avoid missing-column errors; we’ll map safely in JS.
    supa
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .order("observed_at", { ascending: false }),
    supa
      .from("observations")
      .select("*")
      .eq("user_id", userId)
      .order("observed_at", { ascending: false }),
  ]);

  if (predRes.error)
    return NextResponse.json({ error: predRes.error.message }, { status: 500, headers: noStore });
  if (obsRes.error)
    return NextResponse.json({ error: obsRes.error.message }, { status: 500, headers: noStore });

  const preds = (predRes.data ?? []).map((r: any) => {
    const details = r.details ?? r.meta ?? null;
    // Derive a display name from whatever exists
    const displayName =
      r.name ??
      r.label ??
      r.finding ??
      r.type ??
      (details?.label || details?.name || details?.task) ??
      "Prediction";

    // Derive a probability if present in any common place
    const probability =
      typeof r.probability === "number"
        ? r.probability
        : typeof details?.fractured === "number"
        ? details.fractured
        : typeof details?.probability === "number"
        ? details.probability
        : null;

    const observedAt = r.observed_at ?? r.created_at ?? new Date().toISOString();

    return {
      id: r.id,
      kind: "prediction",
      name: displayName,
      probability,
      observed_at: observedAt,
      source_upload_id: r.source_upload_id ?? null,
      meta: details,
    };
  });

  const obs = (obsRes.data ?? []).map((r: any) => {
    const meta = r.meta ?? r.details ?? null;
    const displayName = r.name ?? r.metric ?? r.test ?? "Observation";
    const value = r.value ?? meta?.value ?? null;
    const unit = r.unit ?? meta?.unit ?? null;
    const flags = Array.isArray(r.flags)
      ? r.flags
      : Array.isArray(meta?.flags)
      ? meta.flags
      : null;
    const observedAt = r.observed_at ?? r.created_at ?? new Date().toISOString();

    return {
      id: r.id,
      kind: "observation",
      name: displayName,
      value,
      unit,
      flags,
      observed_at: observedAt,
      source_upload_id: r.source_upload_id ?? null,
      meta,
    };
  });

  const items = [...preds, ...obs].sort(
    (a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );

  return NextResponse.json({ items }, { headers: noStore });
}

