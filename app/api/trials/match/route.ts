import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { searchTrials, dedupeTrials, rankValue, type Trial } from "@/lib/trials/search";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: elig } = await db.from("trial_eligibility_profiles").select("*").eq("user_id", userId).single();
  if (!elig || !Array.isArray(elig.conditions) || !elig.conditions.length) {
    return NextResponse.json({ error: "No eligibility profile. Build one first via /api/trials/eligibility." }, { status: 400 });
  }

  const conditions = elig.conditions.slice(0, 3) as string[];
  const allTrials: (Trial & { _cond: string })[] = [];

  for (const condition of conditions) {
    try {
      const trials = await searchTrials({ query: condition, status: "Recruiting,Enrolling by invitation", country: (elig.geographic as Record<string, string>)?.country || undefined });
      allTrials.push(...trials.map((t) => ({ ...t, _cond: condition })));
    } catch (error) {
      console.error(`Failed to search trials for "${condition}":`, error);
    }
  }

  const deduped = dedupeTrials(allTrials).sort((a, b) => rankValue(b) - rankValue(a));
  const matches = deduped.slice(0, 20).map((trial: Trial & { _cond?: string }) => {
    let matchScore = 50;
    const reasons: { criterion: string; met: boolean }[] = [];
    const titleLower = (trial.title || "").toLowerCase();
    if (conditions.some((c) => titleLower.includes(c.toLowerCase()))) { matchScore += 20; reasons.push({ criterion: "Condition in title", met: true }); }
    if (trial.status === "Recruiting") { matchScore += 10; reasons.push({ criterion: "Actively recruiting", met: true }); }
    if (trial.country && (elig.geographic as Record<string, string>)?.country) {
      if (trial.country.toLowerCase().includes(((elig.geographic as Record<string, string>).country || "").toLowerCase())) { matchScore += 10; reasons.push({ criterion: "Same country", met: true }); }
    }
    return {
      user_id: userId, nct_id: trial.id || "", trial_title: trial.title || "Untitled",
      condition: (trial as Trial & { _cond?: string })._cond || conditions[0],
      phase: trial.phase || null, status: trial.status || null, sponsor: null,
      match_score: Math.max(0, Math.min(100, matchScore)), match_reasons: reasons,
      disqualifiers: reasons.filter((r) => !r.met), patient_status: "new",
      matched_at: new Date().toISOString(), trial_locations: null,
    };
  }).filter((m) => m.nct_id);

  if (matches.length > 0) {
    const { error } = await db.from("trial_matches").upsert(matches, { onConflict: "user_id,nct_id" });
    if (error) console.error("[trials/match] upsert:", error);
  }

  return NextResponse.json({ ok: true, matchCount: matches.length, matches });
}
