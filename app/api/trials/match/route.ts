import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { searchTrials, dedupeTrials, rankValue } from "@/lib/trials/search";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();

  const { data: elig } = await db
    .from("trial_eligibility_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!elig || !elig.conditions?.length) {
    return NextResponse.json({ error: "No eligibility profile. Build one first via /api/trials/eligibility." }, { status: 400 });
  }

  const conditions = (elig.conditions as string[]).slice(0, 3);
  const allTrials: any[] = [];

  for (const condition of conditions) {
    try {
      const trials = await searchTrials({
        query: condition,
        status: "Recruiting,Enrolling by invitation",
        country: (elig.geographic as any)?.country || undefined,
      });
      allTrials.push(...trials.map((t) => ({ ...t, _searchCondition: condition })));
    } catch { /* continue */ }
  }

  const deduped = dedupeTrials(allTrials).sort((a, b) => rankValue(b) - rankValue(a));
  const top = deduped.slice(0, 20);

  const matches = top.map((trial: any) => {
    let matchScore = 50;
    const reasons: any[] = [];

    // Condition match
    const titleLower = (trial.title || "").toLowerCase();
    const condMatch = conditions.some((c) => titleLower.includes(c.toLowerCase()));
    if (condMatch) { matchScore += 20; reasons.push({ criterion: "Condition in title", met: true }); }

    // Recruiting bonus
    if (trial.status === "Recruiting") { matchScore += 10; reasons.push({ criterion: "Actively recruiting", met: true }); }

    // Country match
    if (trial.country && elig.geographic) {
      const trialCountry = (trial.country || "").toLowerCase();
      const userCountry = ((elig.geographic as any)?.country || "").toLowerCase();
      if (trialCountry.includes(userCountry) || userCountry.includes(trialCountry)) {
        matchScore += 10; reasons.push({ criterion: "Same country", met: true });
      }
    }

    // Phase preference
    if (trial.phase && !(elig.exclude_phases || []).includes(trial.phase)) {
      matchScore += 5; reasons.push({ criterion: "Phase not excluded", met: true });
    }

    return {
      user_id: userId,
      nct_id: trial.id || "",
      trial_title: trial.title || "Untitled",
      condition: trial._searchCondition || conditions[0],
      phase: trial.phase || null,
      status: trial.status || null,
      sponsor: null,
      match_score: Math.max(0, Math.min(100, matchScore)),
      match_reasons: reasons,
      disqualifiers: reasons.filter((r: any) => !r.met),
      patient_status: "new",
      matched_at: new Date().toISOString(),
      trial_locations: null,
    };
  });

  for (const match of matches) {
    if (!match.nct_id) continue;
    await db.from("trial_matches").upsert(match, { onConflict: "user_id,nct_id" });
  }

  return NextResponse.json({ ok: true, matchCount: matches.length, matches });
}
