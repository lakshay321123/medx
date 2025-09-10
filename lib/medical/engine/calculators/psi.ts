// lib/medical/engine/calculators/psi.ts
import { round } from "./utils";

export interface PSIInput {
  age_years: number;
  female?: boolean;
  nursing_home_resident?: boolean;

  neoplastic_disease?: boolean;
  liver_disease?: boolean;
  chf?: boolean;
  cerebrovascular_disease?: boolean;
  renal_disease?: boolean;

  altered_mental_status?: boolean;
  respiratory_rate_ge_30?: boolean;
  sbp_lt_90?: boolean;
  temp_c?: number | null;
  pulse_ge_125?: boolean;

  ph_lt_7_35?: boolean;
  bun_mg_dL?: number | null;
  sodium_mEq_L?: number | null;
  glucose_mg_dL?: number | null;
  hematocrit_pct?: number | null;
  pao2_mmHg?: number | null;
  spo2_percent?: number | null;
  pleural_effusion?: boolean;
}

export function runPSI(i: PSIInput) {
  let pts = 0;

  // Demographics
  pts += i.age_years;
  if (i.female) pts -= 10;
  if (i.nursing_home_resident) pts += 10;

  // Comorbidities
  if (i.neoplastic_disease) pts += 30;
  if (i.liver_disease) pts += 20;
  if (i.chf) pts += 10;
  if (i.cerebrovascular_disease) pts += 10;
  if (i.renal_disease) pts += 10;

  // Exam
  if (i.altered_mental_status) pts += 20;
  if (i.respiratory_rate_ge_30) pts += 20;
  if (i.sbp_lt_90) pts += 20;
  if (typeof i.temp_c === "number" && (i.temp_c < 35 || i.temp_c >= 40)) pts += 15;
  if (i.pulse_ge_125) pts += 10;

  // Labs/Imaging
  if (i.ph_lt_7_35) pts += 30;
  if (typeof i.bun_mg_dL === "number" && i.bun_mg_dL >= 30) pts += 20;
  if (typeof i.sodium_mEq_L === "number" && i.sodium_mEq_L < 130) pts += 20;
  if (typeof i.glucose_mg_dL === "number" && i.glucose_mg_dL >= 250) pts += 10;
  if (typeof i.hematocrit_pct === "number" && i.hematocrit_pct < 30) pts += 10;
  const hypoxemia = (typeof i.pao2_mmHg === "number" && i.pao2_mmHg < 60) ||
                    (typeof i.spo2_percent === "number" && i.spo2_percent < 90);
  if (hypoxemia) pts += 10;
  if (i.pleural_effusion) pts += 10;

  // Risk classes using score (Note: class I is special-case; we map by score ranges)
  let klass: "II"|"III"|"IV"|"V";
  if (pts <= 70) klass = "II";
  else if (pts <= 90) klass = "III";
  else if (pts <= 130) klass = "IV";
  else klass = "V";

  return { psi_points: pts, psi_class: klass };
}
