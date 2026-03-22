import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("trial_eligibility_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return NextResponse.json(data || null);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();

  // Auto-extract from patient data
  const { data: profile } = await db.from("profiles").select("*").eq("id", userId).single();
  const { data: obs } = await db
    .from("observations")
    .select("kind, value_text")
    .eq("user_id", userId)
    .in("kind", ["condition", "diagnosis", "chronic"]);
  const { data: labs } = await db
    .from("observation_labs")
    .select("test_code, value")
    .eq("user_id", userId)
    .order("sample_date", { ascending: false })
    .limit(20);
  const { data: meds } = await db
    .from("medications")
    .select("name")
    .eq("patient_id", userId)
    .eq("active", true);

  const conditions = [...new Set((obs ?? []).map((o) => o.value_text).filter(Boolean))];
  const biomarkers: Record<string, number> = {};
  const seen = new Set<string>();
  for (const l of labs ?? []) {
    if (l.test_code && l.value != null && !seen.has(l.test_code)) {
      biomarkers[l.test_code] = Number(l.value);
      seen.add(l.test_code);
    }
  }
  const medNames = (meds ?? []).map((m) => m.name);
  const age = profile?.dob ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / 31557600000) : undefined;

  const eligibility = {
    user_id: userId,
    conditions,
    age: age ?? null,
    sex: profile?.sex ?? null,
    biomarkers,
    medications: medNames,
    allergies: [],
    prior_therapies: [],
    comorbidities: (profile?.chronic_conditions as string[]) ?? [],
    geographic: { country: profile?.country ?? null },
    data_sources: ["profiles", "observations", "observation_labs", "medications"],
    computed_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("trial_eligibility_profiles")
    .upsert(eligibility, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}
