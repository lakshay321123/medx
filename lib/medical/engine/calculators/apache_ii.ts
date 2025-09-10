// lib/medical/engine/calculators/apache_ii.ts
// APACHE II: Acute Physiology And Chronic Health Evaluation II
// Total = APS (12 vars) + Age points + Chronic health points
// Sources: Knaus WA et al. Crit Care Med. 1985;13(10):818–29 (table logic encoded below)

export interface ApacheIIInput {
  // Acute physiology (worst in first 24h)
  temp_c?: number;                 // core/rectal °C
  map_mmHg?: number;               // mean arterial pressure
  hr_bpm?: number;                 // heart rate
  rr_bpm?: number;                 // respiratory rate
  fio2?: number;                   // fraction (0.21–1.0), if >=0.5 prefer A–aDO2 path
  pao2_mmHg?: number;              // arterial PaO2 (used if FiO2 < 0.5 or A–a not available)
  aado2_mmHg?: number;             // A–a gradient (used if FiO2 >= 0.5)
  ph_arterial?: number;            // arterial pH (preferred for acid–base)
  hco3_mEq_L?: number;             // only used if no ABG pH available (serum bicarb/total CO2)
  sodium_mEq_L?: number;
  potassium_mEq_L?: number;
  creat_mg_dL?: number;
  creat_acute_renal_failure?: boolean; // doubles creatinine points when true
  hematocrit_pct?: number;
  wbc_k_uL?: number;               // ×10^3/µL
  gcs?: number;                    // 3–15 (use post-resuscitation)

  // Age
  age_years?: number;

  // Chronic health (severe organ insufficiency or immunocompromised)
  has_severe_chronic_illness?: boolean;
  admission_type?: "nonoperative" | "emergency_postop" | "elective_postop" | "unknown";
}

export interface ApacheIIResult {
  id: "apache_ii";
  title: "APACHE II";
  aps_points?: number;                 // Acute Physiology Score (sum of 12 items)
  age_points?: number;
  chronic_health_points?: number;
  total?: number;                      // present only when complete
  missing: string[];                   // which inputs were missing for a complete total
  notes: string[];                     // guardrails/info
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function scoreTempC(t: number): number {
  if (t >= 41) return 4;
  if (t >= 39 && t < 41) return 3;
  if (t >= 38.5 && t < 39) return 1;
  if (t >= 36 && t < 38.5) return 0;
  if (t >= 34 && t < 36) return 1;
  if (t >= 32 && t < 34) return 2;
  if (t >= 30 && t < 32) return 3;
  return 4; // <30
}

function scoreMAP(m: number): number {
  if (m >= 160) return 4;
  if (m >= 130) return 3;
  if (m >= 110) return 2;
  if (m >= 70) return 0;
  if (m >= 50) return 2;
  return 4; // <50
}

function scoreHR(hr: number): number {
  if (hr >= 180) return 4;
  if (hr >= 140) return 3;
  if (hr >= 110) return 2;
  if (hr >= 70) return 0;
  if (hr >= 55) return 2;
  if (hr >= 40) return 3;
  return 4; // <40
}

function scoreRR(rr: number): number {
  if (rr >= 50) return 4;
  if (rr >= 35) return 3;
  if (rr >= 25) return 1;
  if (rr >= 12) return 0;
  if (rr >= 10) return 1;
  if (rr >= 6) return 2;
  return 4; // <6
}

// Oxygenation block: If FiO2 >= 0.5, use A–aDO2; else use PaO2 (per APACHE II table)
function scoreOx(fio2?: number, pao2?: number, aado2?: number): { points: number; needs?: string } {
  if (fio2 == null) {
    // fallback: try to score by what we have (PaO2 path)
    if (pao2 == null) return { points: 0, needs: "fio2 or pao2" };
    return { points: scorePaO2(pao2) };
  }
  if (fio2 >= 0.5) {
    if (aado2 == null) return { points: 0, needs: "aado2_mmHg (since FiO2 ≥ 0.5)" };
    return { points: scoreAaDO2(aado2) };
  }
  // fio2 < 0.5 path
  if (pao2 == null) return { points: 0, needs: "pao2_mmHg (since FiO2 < 0.5)" };
  return { points: scorePaO2(pao2) };
}

function scoreAaDO2(a: number): number {
  if (a >= 500) return 4;
  if (a >= 350) return 3;
  if (a >= 200) return 2;
  return 0; // <200
}

function scorePaO2(p: number): number {
  if (p >= 70) return 0;
  if (p >= 61) return 1;
  if (p >= 55) return 3;
  return 4; // <55
}

function scoreAcidBase(ph?: number, hco3?: number): { points: number; needs?: string } {
  if (ph != null) return { points: scorePH(ph) };
  if (hco3 != null) return { points: scoreHCO3(hco3) };
  return { points: 0, needs: "ph_arterial or hco3_mEq_L" };
}

function scorePH(ph: number): number {
  if (ph >= 7.7) return 4;
  if (ph >= 7.6) return 3;
  if (ph >= 7.5) return 1;
  if (ph >= 7.33) return 0;
  if (ph >= 7.25) return 2;
  if (ph >= 7.15) return 3;
  return 4; // <7.15
}

function scoreHCO3(h: number): number {
  if (h >= 52) return 4;
  if (h >= 41) return 3;
  if (h >= 32) return 1;
  if (h >= 22) return 0;
  if (h >= 18) return 2;
  if (h >= 15) return 3;
  return 4; // <15
}

function scoreNa(na: number): number {
  if (na >= 180) return 4;
  if (na >= 160) return 3;
  if (na >= 155) return 2;
  if (na >= 150) return 1;
  if (na >= 130) return 0;
  if (na >= 120) return 2;
  if (na >= 111) return 3;
  return 4; // ≤110
}

function scoreK(k: number): number {
  if (k >= 7) return 4;
  if (k >= 6) return 3;
  if (k >= 5.5) return 1;
  if (k >= 3.5) return 0;
  if (k >= 3.0) return 1;
  if (k >= 2.5) return 2;
  return 4; // <2.5
}

function scoreCreat(cr: number, arf: boolean): number {
  let pts = 0;
  if (cr >= 3.5) pts = 4;
  else if (cr >= 2.0) pts = 3;
  else if (cr >= 1.5) pts = 2;
  else if (cr >= 0.6) pts = 0;
  else pts = 2; // <0.6
  return arf ? pts * 2 : pts;
}

function scoreHct(h: number): number {
  if (h >= 60) return 4;
  if (h >= 50) return 2;
  if (h >= 46) return 1;
  if (h >= 30) return 0;
  if (h >= 20) return 2;
  return 4; // <20
}

function scoreWBC(w: number): number {
  if (w >= 40) return 4;
  if (w >= 20) return 2;
  if (w >= 15) return 1;
  if (w >= 3) return 0;
  if (w >= 1) return 2;
  return 4; // <1
}

function scoreGCS(g: number): number {
  const gcs = clamp(g, 3, 15);
  return 15 - gcs; // per APACHE II
}

function agePoints(age: number): number {
  if (age >= 75) return 6;
  if (age >= 65) return 5;
  if (age >= 55) return 3;
  if (age >= 45) return 2;
  return 0;
}

function chronicPoints(hasSevere: boolean, type: ApacheIIInput["admission_type"]): number {
  if (!hasSevere) return 0;
  if (type === "elective_postop") return 2;
  if (type === "nonoperative" || type === "emergency_postop") return 5;
  return 5; // default conservative if unknown
}

export function runAPACHEII(input: ApacheIIInput): ApacheIIResult {
  const i = input;
  const missing: string[] = [];
  const notes: string[] = [];

  // Acute physiology (12 items)
  const parts: number[] = [];

  if (i.temp_c == null) missing.push("temp_c");
  else parts.push(scoreTempC(i.temp_c));

  if (i.map_mmHg == null) missing.push("map_mmHg");
  else parts.push(scoreMAP(i.map_mmHg));

  if (i.hr_bpm == null) missing.push("hr_bpm");
  else parts.push(scoreHR(i.hr_bpm));

  if (i.rr_bpm == null) missing.push("rr_bpm");
  else parts.push(scoreRR(i.rr_bpm));

  const ox = scoreOx(i.fio2, i.pao2_mmHg, i.aado2_mmHg);
  if (ox.needs) missing.push(ox.needs);
  else parts.push(ox.points);

  const ab = scoreAcidBase(i.ph_arterial, i.hco3_mEq_L);
  if (ab.needs) missing.push(ab.needs);
  else parts.push(ab.points);

  if (i.sodium_mEq_L == null) missing.push("sodium_mEq_L");
  else parts.push(scoreNa(i.sodium_mEq_L));

  if (i.potassium_mEq_L == null) missing.push("potassium_mEq_L");
  else parts.push(scoreK(i.potassium_mEq_L));

  if (i.creat_mg_dL == null) missing.push("creat_mg_dL");
  else parts.push(scoreCreat(i.creat_mg_dL, !!i.creat_acute_renal_failure));

  if (i.hematocrit_pct == null) missing.push("hematocrit_pct");
  else parts.push(scoreHct(i.hematocrit_pct));

  if (i.wbc_k_uL == null) missing.push("wbc_k_uL");
  else parts.push(scoreWBC(i.wbc_k_uL));

  if (i.gcs == null) {
    missing.push("gcs");
  } else {
    if (i.gcs < 15) notes.push("GCS points are calculated post-resuscitation per APACHE II.");
    parts.push(scoreGCS(i.gcs));
  }

  const aps = parts.reduce((a, b) => a + b, 0);

  // Age
  let agePts: number | undefined = undefined;
  if (i.age_years == null) {
    missing.push("age_years");
  } else {
    agePts = agePoints(i.age_years);
  }

  // Chronic health
  let chPts: number | undefined = undefined;
  if (i.has_severe_chronic_illness == null || i.admission_type == null) {
    // Allow zero if clearly absent
    if (i.has_severe_chronic_illness === false) {
      chPts = 0;
    } else {
      missing.push("has_severe_chronic_illness");
      missing.push("admission_type");
    }
  } else {
    chPts = chronicPoints(i.has_severe_chronic_illness, i.admission_type);
  }

  const result: ApacheIIResult = {
    id: "apache_ii",
    title: "APACHE II",
    aps_points: aps,
    age_points: agePts,
    chronic_health_points: chPts,
    missing,
    notes,
  };

  if (missing.length === 0 && agePts != null && chPts != null) {
    result.total = aps + agePts + chPts;
  }

  return result;
}
