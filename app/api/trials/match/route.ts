import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { searchTrials, dedupeTrials, rankValue } from "@/lib/trials/search";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();

  // Load eligibility profile
  const { data: elig } = await db
    .from("trial_eligibility_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!elig || !elig.conditions?.length) {
    return NextResponse.json({ error: "No eligibility profile found. Build one first via /api/trials/eligibility." }, { status: 400 });
  }

  // Search trials for top 3 conditions
  const conditions = (elig.conditions as string[]).slice(0, 3);
  const allTrials = [];

  for (const condition of conditions) {
    try {
      const trials = await searchTrials({
        query: condition,
        status: "Recruiting,Enrolling by invitation",
        country: (elig.geographic as any)?.country || undefined,
      });
      allTrials.push(...trials);
    } catch { /* continue on error */ }
  }

  const deduped = dedupeTrials(allTrials).sort((a, b) => rankValue(b) - rankValue(a));
  const top = deduped.slice(0, 20);

  // Score each trial against patient profile
  const matches = top.map((trial) => {
    let matchScore = 50; // base score
    const reasons: any[] = [];

    // Condition match
    const condMatch = conditions.some((c) =>
      (trial.condition || "").toLowerCase().includes(c.toLowerCase())
    );
    if (condMatch) { matchScore += 20; reasons.push({ criterion: "Condition match", met: true }); }

    // Status bonus
    if (trial.status === "Recruiting") { matchScore += 10; reasons.push({ criterion: "Actively recruiting", met: true }); }

    // Age check (if available)
    if (elig.age && trial.eligibility) {
      const eligText = typeof trial.eligibility === "string" ? trial.eligibility : JSON.stringify(trial.eligibility);
      const ageMatch = eligText.match(/(\d+)\s*(?:to|-)?\s*(\d+)?\s*years/i);
      if (ageMatch) {
        const minAge = parseInt(ageMatch[1]);
        const maxAge = ageMatch[2] ? parseInt(ageMatch[2]) : 999;
        if (elig.age >= minAge && elig.age <= maxAge) {
          matchScore += 10; reasons.push({ criterion: `Age ${elig.age} within ${minAge}-${maxAge}`, met: true });
        } else {
          matchScore -= 20; reasons.push({ criterion: `Age ${elig.age} outside ${minAge}-${maxAge}`, met: false });
        }
      }
    }

    return {
      user_id: userId,
      nct_id: trial.nctId || trial.id || "",
      trial_title: trial.title || trial.briefTitle || "Untitled",
      condition: trial.condition || conditions[0],
      phase: trial.phase || null,
      status: trial.status || null,
      sponsor: trial.sponsor || trial.leadSponsor || null,
      match_score: Math.max(0, Math.min(100, matchScore)),
      match_reasons: reasons,
      disqualifiers: reasons.filter((r: any) => !r.met),
      patient_status: "new",
      matched_at: new Date().toISOString(),
      trial_locations: trial.locations || null,
    };
  });

  // Upsert matches
  for (const match of matches) {
    if (!match.nct_id) continue;
    await db.from("trial_matches").upsert(match, { onConflict: "user_id,nct_id" });
  }

  return NextResponse.json({ ok: true, matchCount: matches.length, matches });
}
