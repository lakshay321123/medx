// lib/medical/engine/calculators/apache_ii.ts

export interface APACHEIIInput {
  // Acute physiology (worst in first 24h)
  temp_c?: number | null;
  map_mmHg?: number | null;
  hr_bpm?: number | null;
  rr_bpm?: number | null;
  fio2_frac?: number | null;          // 0–1
  pao2_mmHg?: number | null;
  aa_gradient_mmHg?: number | null;   // use if FiO2 >= 0.5
  arterial_pH?: number | null;
  sodium_mEq_L?: number | null;
  potassium_mEq_L?: number | null;
  creatinine_mg_dL?: number | null;
  acute_renal_failure?: boolean | null; // doubles Cr points if true
  hematocrit_pct?: number | null;
  wbc_k_per_uL?: number | null;
  gcs?: number | null;                  // 3–15

  // Age
  age_years?: number | null;

  // Chronic health
  chronic_severe_org_insuff_or_immunocomp?: boolean | null;
  admission_category?: "nonoperative" | "emergency_postop" | "elective_postop" | null;
}

export interface APACHEIIOutput {
  aps_points: number;
  age_points: number;
  chronic_health_points: number;
  total_points: number;
  components: Record<string, number>;
}

function scoreTempC(t: number): number {
  if (t >= 41) return 4;
  if (t >= 39) return 3;
  if (t >= 38.5) return 1;
  if (t >= 36) return 0;
  if (t >= 34) return 1;
  if (t >= 32) return 2;
  if (t >= 30) return 3;
  return 4;
}
function scoreMAP(p: number): number {
  if (p >= 160) return 4;
  if (p >= 130) return 3;
  if (p >= 110) return 2;
  if (p >= 70) return 0;
  if (p >= 50) return 2;
  return 4;
}
function scoreHR(hr: number): number {
  if (hr >= 180) return 4;
  if (hr >= 140) return 3;
  if (hr >= 110) return 2;
  if (hr >= 70) return 0;
  if (hr >= 55) return 2;
  if (hr >= 40) return 3;
  return 4;
}
function scoreRR(rr: number): number {
  if (rr >= 50) return 4;
  if (rr >= 35) return 3;
  if (rr >= 25) return 1;
  if (rr >= 12) return 0;
  if (rr >= 10) return 1;
  if (rr >= 6) return 2;
  return 4;
}
function scoreOxy(pao2: number | null, aa: number | null, fio2: number | null): number {
  const F = fio2 ?? 0;
  if (F >= 0.5) {
    if (aa === null || aa === undefined) return 0;
    if (aa >= 500) return 4;
    if (aa >= 350) return 3;
    if (aa >= 200) return 2;
    return 0;
  } else {
    if (pao2 === null || pao2 === undefined) return 0;
    if (pao2 < 55) return 4;
    if (pao2 <= 60) return 3;
    if (pao2 <= 70) return 1;
    return 0;
  }
}
function scorepH(pH: number): number {
  if (pH >= 7.7) return 4;
  if (pH >= 7.6) return 3;
  if (pH >= 7.5) return 1;
  if (pH >= 7.33) return 0;
  if (pH >= 7.25) return 2;
  if (pH >= 7.15) return 3;
  return 4;
}
function scoreNa(na: number): number {
  if (na >= 180) return 4;
  if (na >= 160) return 3;
  if (na >= 155) return 2;
  if (na >= 150) return 1;
  if (na >= 130) return 0;
  if (na >= 120) return 2;
  if (na >= 111) return 3;
  return 4;
}
function scoreK(k: number): number {
  if (k >= 7.0) return 4;
  if (k >= 6.0) return 3;
  if (k >= 5.5) return 1;
  if (k >= 3.5) return 0;
  if (k >= 3.0) return 1;
  if (k >= 2.5) return 2;
  return 4;
}
function scoreCr(cr: number, arf: boolean): number {
  let pts = 0;
  if (cr >= 3.5) pts = 4;
  else if (cr >= 2.0) pts = 3;
  else if (cr >= 1.5) pts = 2;
  else if (cr < 0.6) pts = 2;
  if (arf && pts > 0) pts *= 2;
  return pts;
}
function scoreHct(h: number): number {
  if (h >= 60) return 4;
  if (h >= 50) return 2;
  if (h >= 46) return 1;
  if (h >= 30) return 0;
  if (h >= 20) return 2;
  return 4;
}
function scoreWBC(w: number): number {
  if (w >= 40) return 4;
  if (w >= 20) return 2;
  if (w >= 15) return 1;
  if (w >= 3) return 0;
  if (w >= 1) return 2;
  return 4;
}
function scoreGCS(g: number): number {
  const val = Math.max(3, Math.min(15, Math.round(g)));
  return 15 - val;
}
function scoreAge(age: number): number {
  if (age >= 75) return 6;
  if (age >= 65) return 5;
  if (age >= 55) return 3;
  if (age >= 45) return 2;
  return 0;
}
function scoreChronic(chronic: boolean, cat: APACHEIIInput["admission_category"]): number {
  if (!chronic) return 0;
  if (cat === "elective_postop") return 2;
  return 5; // nonoperative or emergency postop
}

export function runAPACHEII(i: APACHEIIInput): APACHEIIOutput {
  const comp: Record<string, number> = {};

  comp.temp = (i.temp_c ?? null) !== null ? scoreTempC(i.temp_c as number) : 0;
  comp.map = (i.map_mmHg ?? null) !== null ? scoreMAP(i.map_mmHg as number) : 0;
  comp.hr = (i.hr_bpm ?? null) !== null ? scoreHR(i.hr_bpm as number) : 0;
  comp.rr = (i.rr_bpm ?? null) !== null ? scoreRR(i.rr_bpm as number) : 0;
  comp.oxygenation = scoreOxy(i.pao2_mmHg ?? null, i.aa_gradient_mmHg ?? null, i.fio2_frac ?? null);
  comp.ph = (i.arterial_pH ?? null) !== null ? scorepH(i.arterial_pH as number) : 0;
  comp.na = (i.sodium_mEq_L ?? null) !== null ? scoreNa(i.sodium_mEq_L as number) : 0;
  comp.k = (i.potassium_mEq_L ?? null) !== null ? scoreK(i.potassium_mEq_L as number) : 0;
  comp.creatinine = (i.creatinine_mg_dL ?? null) !== null ? scoreCr(i.creatinine_mg_dL as number, !!i.acute_renal_failure) : 0;
  comp.hct = (i.hematocrit_pct ?? null) !== null ? scoreHct(i.hematocrit_pct as number) : 0;
  comp.wbc = (i.wbc_k_per_uL ?? null) !== null ? scoreWBC(i.wbc_k_per_uL as number) : 0;
  comp.gcs = (i.gcs ?? null) !== null ? scoreGCS(i.gcs as number) : 0;

  const aps = Object.values(comp).reduce((a,b)=>a+b,0);
  const agePts = (i.age_years ?? null) !== null ? scoreAge(i.age_years as number) : 0;
  const chPts = scoreChronic(!!i.chronic_severe_org_insuff_or_immunocomp, i.admission_category ?? "nonoperative");
  const total = aps + agePts + chPts;

  return {
    aps_points: aps,
    age_points: agePts,
    chronic_health_points: chPts,
    total_points: total,
    components: comp
  };
}
