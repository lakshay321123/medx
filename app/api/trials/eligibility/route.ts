import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const db = supabaseAdmin();
  const { data } = await db.from("trial_eligibility_profiles").select("*").eq("user_id", userId).single();
  return NextResponse.json(data || null);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const [{ data: profile }, { data: obs }, { data: labs }, { data: meds }] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).single(),
    db.from("observations").select("kind, value_text").eq("user_id", userId).in("kind", ["condition", "diagnosis", "chronic"]),
    db.from("observation_labs").select("test_code, value").eq("user_id", userId).order("sample_date", { ascending: false }).limit(20),
    db.from("medications").select("name").eq("patient_id", userId).eq("active", true),
  ]);

  const conditions = [...new Set((obs ?? []).map((o) => o.value_text).filter(Boolean))];
  const biomarkers: Record<string, number> = {};
  const seen = new Set<string>();
  for (const l of labs ?? []) {
    if (l.test_code && l.value != null && !seen.has(l.test_code)) { biomarkers[l.test_code] = Number(l.value); seen.add(l.test_code); }
  }
  const age = profile?.dob ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / MS_PER_YEAR) : null;

  const { data, error } = await db.from("trial_eligibility_profiles").upsert({
    user_id: userId, conditions, age, sex: profile?.sex ?? null, biomarkers,
    medications: (meds ?? []).map((m) => m.name), allergies: [], prior_therapies: [],
    comorbidities: Array.isArray(profile?.chronic_conditions) ? profile.chronic_conditions : [],
    geographic: { country: profile?.country ?? null },
    data_sources: ["profiles", "observations", "observation_labs", "medications"],
    computed_at: new Date().toISOString(),
  }, { onConflict: "user_id" }).select().single();

  if (error) { console.error("[trials/eligibility]:", error); return NextResponse.json({ error: "Could not save profile." }, { status: 500 }); }
  return NextResponse.json({ ok: true, profile: data });
}
