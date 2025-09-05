export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

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

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ items: [] }, { headers: noStore });

  const [predRes, obsRes] = await Promise.all([
    supabaseAdmin()
      .from("predictions")
      .select("id, name, probability, observed_at, source_upload_id, details")
      .eq("user_id", userId)
      .order("observed_at", { ascending: false }),
    supabaseAdmin()
      .from("observations")
      .select("id, name, value, unit, flags, observed_at, source_upload_id, meta")
      .eq("user_id", userId)
      .order("observed_at", { ascending: false }),
  ]);

  if (predRes.error) {
    return NextResponse.json({ error: predRes.error.message }, { status: 500, headers: noStore });
  }
  if (obsRes.error) {
    return NextResponse.json({ error: obsRes.error.message }, { status: 500, headers: noStore });
  }

  const preds: TimelineItem[] = (predRes.data ?? []).map((r: any) => ({
    id: r.id,
    kind: "prediction",
    name: r.name ?? "Model prediction",
    probability: r.probability ?? null,
    observed_at: r.observed_at ?? new Date().toISOString(),
    source_upload_id: r.source_upload_id ?? null,
    meta: r.details ?? null,
  }));

  const obs: TimelineItem[] = (obsRes.data ?? []).map((r: any) => ({
    id: r.id,
    kind: "observation",
    name: r.name ?? "Observation",
    value: r.value ?? null,
    unit: r.unit ?? null,
    flags: r.flags ?? null,
    observed_at: r.observed_at ?? new Date().toISOString(),
    source_upload_id: r.source_upload_id ?? null,
    meta: r.meta ?? null,
  }));

  const items = [...preds, ...obs].sort(
    (a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );

  return NextResponse.json({ items }, { headers: noStore });
}

