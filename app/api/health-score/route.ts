import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  computeOverall,
  scoreHba1c,
  scoreLdl,
  scoreEgfr,
  scoreBmi,
  scoreBp,
  scoreHr,
  scoreSpo2,
  scoreSteps,
  scoreSleep,
  scoreAdherence,
  scoreMood,
  generateRecommendations,
  type SubScores,
  type HealthFactor,
  type HealthScoreResult,
} from "@/lib/healthScore/compute";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const factors: HealthFactor[] = [];
  const labScores: number[] = [];
  const vitalScores: number[] = [];

  // --- Labs from observation_labs (latest values) ---
  const { data: labs } = await db
    .from("observation_labs")
    .select("test_code, value, unit")
    .eq("user_id", userId)
    .order("sample_date", { ascending: false })
    .limit(50);

  const latestLab: Record<string, number> = {};
  for (const l of labs ?? []) {
    if (l.test_code && l.value != null && !latestLab[l.test_code]) {
      latestLab[l.test_code] = Number(l.value);
    }
  }

  if (latestLab["HBA1C"]) { const r = scoreHba1c(latestLab["HBA1C"]); labScores.push(r.score); factors.push(r.factor); }
  if (latestLab["LDL-C"]) { const r = scoreLdl(latestLab["LDL-C"]); labScores.push(r.score); factors.push(r.factor); }
  if (latestLab["EGFR"] || latestLab["eGFR"]) { const v = latestLab["EGFR"] || latestLab["eGFR"]; const r = scoreEgfr(v); labScores.push(r.score); factors.push(r.factor); }

  // --- Vitals ---
  const { data: vitals } = await db
    .from("vitals")
    .select("sbp, dbp, hr, spo2, bmi")
    .eq("patient_id", userId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .single();

  if (vitals) {
    if (vitals.sbp && vitals.dbp) { const r = scoreBp(Number(vitals.sbp), Number(vitals.dbp)); vitalScores.push(r.score); factors.push(r.factor); }
    if (vitals.hr) vitalScores.push(scoreHr(Number(vitals.hr)));
    if (vitals.spo2) vitalScores.push(scoreSpo2(Number(vitals.spo2)));
    if (vitals.bmi) { const r = scoreBmi(Number(vitals.bmi)); labScores.push(r.score); factors.push(r.factor); }
  }

  // --- Profile BMI fallback ---
  if (!vitals?.bmi) {
    const { data: profile } = await db.from("profiles").select("bmi").eq("id", userId).single();
    if (profile?.bmi) { const r = scoreBmi(Number(profile.bmi)); labScores.push(r.score); factors.push(r.factor); }
  }

  // --- Daily checkin (latest) ---
  const { data: checkin } = await db
    .from("daily_checkins")
    .select("mood, sleep_hours, exercise_minutes")
    .eq("user_id", userId)
    .order("check_date", { ascending: false })
    .limit(1)
    .single();

  let activityScore: number | null = null;
  let mentalScore: number | null = null;

  if (checkin) {
    const scores: number[] = [];
    if (checkin.sleep_hours) scores.push(scoreSleep(Number(checkin.sleep_hours)));
    if (checkin.exercise_minutes) scores.push(checkin.exercise_minutes >= 30 ? 100 : checkin.exercise_minutes >= 15 ? 70 : 40);
    if (scores.length) activityScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    if (checkin.mood) mentalScore = scoreMood(Number(checkin.mood));
  }

  // --- Wearable daily aggregates ---
  const { data: wearable } = await db
    .from("wearable_daily_agg")
    .select("steps, sleep_minutes, resting_hr_avg, spo2_avg, active_minutes")
    .eq("user_id", userId)
    .order("agg_date", { ascending: false })
    .limit(1)
    .single();

  if (wearable) {
    const wScores: number[] = [];
    if (wearable.steps) wScores.push(scoreSteps(Number(wearable.steps)));
    if (wearable.sleep_minutes) wScores.push(scoreSleep(Number(wearable.sleep_minutes) / 60));
    if (wearable.active_minutes) wScores.push(Number(wearable.active_minutes) >= 30 ? 100 : 60);
    if (wScores.length) activityScore = Math.round(wScores.reduce((a, b) => a + b, 0) / wScores.length);
    if (wearable.resting_hr_avg) vitalScores.push(scoreHr(Number(wearable.resting_hr_avg)));
    if (wearable.spo2_avg) vitalScores.push(scoreSpo2(Number(wearable.spo2_avg)));
  }

  // --- Adherence (trailing 7 days) ---
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: adherenceLogs } = await db
    .from("med_adherence_log")
    .select("status")
    .eq("user_id", userId)
    .gte("scheduled_at", sevenDaysAgo);

  let adherenceVal: number | null = null;
  if (adherenceLogs && adherenceLogs.length > 0) {
    const taken = adherenceLogs.filter((l) => l.status === "taken" || l.status === "late").length;
    adherenceVal = scoreAdherence(taken, adherenceLogs.length);
  }

  // --- Compose sub-scores ---
  const sub: SubScores = {
    labs: labScores.length ? Math.round(labScores.reduce((a, b) => a + b, 0) / labScores.length) : null,
    vitals: vitalScores.length ? Math.round(vitalScores.reduce((a, b) => a + b, 0) / vitalScores.length) : null,
    activity: activityScore,
    adherence: adherenceVal,
    mental: mentalScore,
  };

  const overall = computeOverall(sub);
  const recommendations = generateRecommendations(sub, factors);

  // --- Get previous score for delta ---
  const { data: prevScore } = await db
    .from("health_scores")
    .select("overall_score")
    .eq("user_id", userId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .single();

  const delta = prevScore ? overall - prevScore.overall_score : null;

  // --- Streak calculation ---
  const { data: checkins } = await db
    .from("daily_checkins")
    .select("check_date")
    .eq("user_id", userId)
    .order("check_date", { ascending: false })
    .limit(90);

  let streakDays = 0;
  if (checkins && checkins.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < checkins.length; i++) {
      const d = new Date(checkins[i].check_date);
      d.setHours(0, 0, 0, 0);
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (d.getTime() === expected.getTime()) {
        streakDays++;
      } else {
        break;
      }
    }
  }

  // --- Persist ---
  await db.from("health_scores").insert({
    user_id: userId,
    overall_score: overall,
    labs_score: sub.labs,
    vitals_score: sub.vitals,
    activity_score: sub.activity,
    adherence_score: sub.adherence,
    mental_score: sub.mental,
    factors,
    recommendations,
    delta,
    streak_days: streakDays,
  });

  const result: HealthScoreResult = { overall, sub, factors, recommendations, delta, streakDays };
  return NextResponse.json(result);
}
