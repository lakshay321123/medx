export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const LAB_KINDS = [
  "hba1c",
  "fasting_glucose",
  "bmi",
  "egfr",
  "blood_group",
  "smoking",
  "family_history",
] as const;

// GET: profile + latest labs (from observations)
export async function GET(_req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const sb = supabaseAdmin();

  // canonical profile row
  const { data: profile, error: perr } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });

  // latest observation per whitelisted kind
  const { data: obs, error: oerr } = await sb
    .from("observations")
    .select("kind, value_num, value_text, unit, observed_at")
    .eq("user_id", userId)
    .in("kind", LAB_KINDS as unknown as string[])
    .order("observed_at", { ascending: false })
    .limit(200);
  if (oerr) return NextResponse.json({ error: oerr.message }, { status: 500 });

  const latest: Record<
    string,
    { value: string | number | null; unit: string | null; observedAt: string } | null
  > = {};
  for (const k of LAB_KINDS) latest[k] = null;

  const seen = new Set<string>();
  for (const r of obs ?? []) {
    if (seen.has(r.kind)) continue; // first = latest due to DESC order
    latest[r.kind] = {
      value: r.value_num ?? r.value_text ?? null,
      unit: r.unit ?? null,
      observedAt: r.observed_at,
    };
    seen.add(r.kind);
  }

  return NextResponse.json({ profile, latest });
}

// (optional) keep PUT if you had it before
export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .upsert({ id: userId, ...body })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
