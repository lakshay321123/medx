import { NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  computeOverall, scoreHba1c, scoreLdl, scoreEgfr, scoreBmi, scoreBp,
  scoreHr, scoreSpo2, scoreSteps, scoreSleep, scoreAdherence, scoreMood,
  generateRecommendations, type SubScores, type HealthFactor, type HealthScoreResult,
} from "@/lib/healthScore/compute";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  let userId = url.searchParams.get("userId");
  if (userId === "me") userId = await getUserId() || null;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = supabaseAdmin();
  const factors: HealthFactor[] = [];
  const labScores: number[] = [];
  const vitalScores: number[] = [];

  // Parallel queries for independent data
  const [labsRes, vitalsRes, profileRes, checkinRes, wearableRes, adherenceRes, prevScoreRes, checkinsRes] = await Promise.all([
    db.from("observation_labs").select("test_code, value, unit").eq("user_id", userId).order("sample_date", { ascending: false }).limit(50),
    // Read vitals from observations (user_id) instead of vitals table (patient_id, empty)
    db.from("observations").select("kind, value_num, unit").eq("user_id", userId).in("kind", ["bp_systolic","bp_diastolic","heart_rate","spo2","bmi"]).order("observed_at", { ascending: false }).limit(10),
    db.from("profiles").select("bmi, height_cm, weight_kg").eq("id", userId).single(),
    db.from("daily_checkins").select("mood, sleep_hours, exercise_minutes").eq("user_id", userId).order("check_date", { ascending: false }).limit(1).single(),
    db.from("wearable_daily_agg").select("steps, sleep_minutes, resting_hr_avg, spo2_avg, active_minutes").eq("user_id", userId).order("agg_date", { ascending: false }).limit(1).single(),
    db.from("med_adherence_log").select("status").eq("user_id", userId).gte("scheduled_at", new Date(Date.now() - 7 * MS_PER_DAY).toISOString()),
    db.from("health_scores").select("overall_score").eq("user_id", userId).order("computed_at", { ascending: false }).limit(1).single(),
    db.from("daily_checkins").select("check_date").eq("user_id", userId).order("check_date", { ascending: false }).limit(90),
  ]);

  // Extract vitals from observations
  const vitalObs: Record<string, number> = {};
  for (const v of (vitalsRes.data ?? []) as any[]) {
    if (v.kind && v.value_num != null && !vitalObs[v.kind]) vitalObs[v.kind] = Number(v.value_num);
  }
  const derivedVitals = {
    sbp: vitalObs["bp_systolic"] ?? null,
    dbp: vitalObs["bp_diastolic"] ?? null,
    hr: vitalObs["heart_rate"] ?? null,
    spo2: vitalObs["spo2"] ?? null,
    bmi: vitalObs["bmi"] ?? profileRes.data?.bmi ?? null,
  };

  // Labs from observation_labs
  const latestLab: Record<string, number> = {};
  for (const l of labsRes.data ?? []) {
    if (l.test_code && l.value != null && !latestLab[l.test_code]) latestLab[l.test_code] = Number(l.value);
  }
  if (latestLab["HBA1C"]) { const r = scoreHba1c(latestLab["HBA1C"]); labScores.push(r.score); factors.push(r.factor); }
  if (latestLab["LDL-C"]) { const r = scoreLdl(latestLab["LDL-C"]); labScores.push(r.score); factors.push(r.factor); }
  if (latestLab["EGFR"] || latestLab["eGFR"]) { const r = scoreEgfr(latestLab["EGFR"] || latestLab["eGFR"]); labScores.push(r.score); factors.push(r.factor); }

  // Vitals — from derivedVitals (observations-based, not empty vitals table)
  if (derivedVitals.sbp && derivedVitals.dbp) { const r = scoreBp(Number(derivedVitals.sbp), Number(derivedVitals.dbp)); vitalScores.push(r.score); factors.push(r.factor); }
  if (derivedVitals.hr) vitalScores.push(scoreHr(Number(derivedVitals.hr)));
  if (derivedVitals.spo2) vitalScores.push(scoreSpo2(Number(derivedVitals.spo2)));
  const bmiVal = derivedVitals.bmi ?? (profileRes.data?.height_cm && profileRes.data?.weight_kg ? Number(profileRes.data.weight_kg) / ((Number(profileRes.data.height_cm) / 100) ** 2) : null);
  if (bmiVal) { const r = scoreBmi(Number(bmiVal)); vitalScores.push(r.score); factors.push(r.factor); }

  // Activity
  let activityScore: number | null = null;
  let mentalScore: number | null = null;
  const checkin = checkinRes.data;
  if (checkin) {
    const scores: number[] = [];
    if (checkin.sleep_hours) scores.push(scoreSleep(Number(checkin.sleep_hours)));
    if (checkin.exercise_minutes) scores.push(Number(checkin.exercise_minutes) >= 30 ? 100 : Number(checkin.exercise_minutes) >= 15 ? 70 : 40);
    if (scores.length) activityScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    if (checkin.mood) mentalScore = scoreMood(Number(checkin.mood));
  }

  // Wearable override
  const wearable = wearableRes.data;
  if (wearable) {
    const wScores: number[] = [];
    if (wearable.steps) wScores.push(scoreSteps(Number(wearable.steps)));
    if (wearable.sleep_minutes) wScores.push(scoreSleep(Number(wearable.sleep_minutes) / 60));
    if (wearable.active_minutes) wScores.push(Number(wearable.active_minutes) >= 30 ? 100 : 60);
    if (wScores.length) activityScore = Math.round(wScores.reduce((a, b) => a + b, 0) / wScores.length);
    if (wearable.resting_hr_avg) vitalScores.push(scoreHr(Number(wearable.resting_hr_avg)));
    if (wearable.spo2_avg) vitalScores.push(scoreSpo2(Number(wearable.spo2_avg)));
  }

  // Adherence
  const adherenceLogs = adherenceRes.data;
  let adherenceVal: number | null = null;
  if (adherenceLogs && adherenceLogs.length > 0) {
    const taken = adherenceLogs.filter((l) => l.status === "taken" || l.status === "late").length;
    adherenceVal = scoreAdherence(taken, adherenceLogs.length);
  }

  const sub: SubScores = {
    labs: labScores.length ? Math.round(labScores.reduce((a, b) => a + b, 0) / labScores.length) : null,
    vitals: vitalScores.length ? Math.round(vitalScores.reduce((a, b) => a + b, 0) / vitalScores.length) : null,
    activity: activityScore, adherence: adherenceVal, mental: mentalScore,
  };

  const overall = computeOverall(sub);
  const recommendations = generateRecommendations(sub, factors);
  const delta = prevScoreRes.data ? overall - prevScoreRes.data.overall_score : null;

  // Streak — compare dates as YYYY-MM-DD strings (UTC-safe)
  let streakDays = 0;
  const checkins = checkinsRes.data ?? [];
  if (checkins.length > 0) {
    const todayUTC = new Date().toISOString().split("T")[0];
    for (let i = 0; i < checkins.length; i++) {
      const expected = new Date(Date.now() - i * MS_PER_DAY).toISOString().split("T")[0];
      if (i === 0 && checkins[i].check_date !== todayUTC && checkins[i].check_date !== expected) break;
      if (checkins[i].check_date === expected) streakDays++;
      else break;
    }
  }

  await db.from("health_scores").insert({
    user_id: userId, overall_score: overall, labs_score: sub.labs, vitals_score: sub.vitals,
    activity_score: sub.activity, adherence_score: sub.adherence, mental_score: sub.mental,
    factors, recommendations, delta, streak_days: streakDays,
  });

  return NextResponse.json({ overall, sub, factors, recommendations, delta, streakDays } as HealthScoreResult);
}
