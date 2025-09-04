export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

// surface these kinds on Profile
const LAB_KINDS = ["hba1c", "fasting_glucose", "bmi", "egfr", "blood_group", "smoking", "family_history"] as const;

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const sb = supabaseAdmin();

  // 1) canonical profile row
  const { data: profile, error: perr } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });

  // 2) latest observation per kind
  const { data: obs, error: oerr } = await sb
    .from("observations")
    .select("kind, value_num, value_text, unit, observed_at")
    .eq("user_id", userId)
    .in("kind", LAB_KINDS as unknown as string[])
    .order("observed_at", { ascending: false })
    .limit(200);
  if (oerr) return NextResponse.json({ error: oerr.message }, { status: 500 });

  const latest: Record<string, { value: string | number | null; unit: string | null; observedAt: string } | null> = {};
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
