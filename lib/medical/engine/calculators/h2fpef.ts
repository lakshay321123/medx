// lib/medical/engine/calculators/h2fpef.ts
import { round } from "./utils";

/** H2FPEF score (Reddy 2018): Heavy(BMI>30)=2, >=2 antihypertensives=1, AF=3, PASP>35=1, age>60=1, E/e' > 9=1 */
export interface H2FPEFInput {
  bmi_kg_m2: number;
  antihypertensive_meds_count: number;
  atrial_fibrillation: boolean;
  pasp_mmHg?: number | null;
  age_years: number;
  e_over_eprime_avg?: number | null;
}

export function runH2FPEF(i: H2FPEFInput) {
  let pts = 0;
  if (i.bmi_kg_m2 > 30) pts += 2;
  if (i.antihypertensive_meds_count >= 2) pts += 1;
  if (i.atrial_fibrillation) pts += 3;
  if ((i.pasp_mmHg ?? 0) > 35) pts += 1;
  if (i.age_years > 60) pts += 1;
  if ((i.e_over_eprime_avg ?? 0) > 9) pts += 1;

  let band: "low"|"intermediate"|"high";
  if (pts <= 1) band = "low";
  else if (pts <= 5) band = "intermediate";
  else band = "high";

  return { h2fpef_points: pts, probability_band: band };
}
