// lib/medical/engine/calculators/edacs.ts
import { round } from "./utils";

/**
 * EDACS score (without the full ADP troponin/ECG gates).
 * Variables per Than et al.: age, sex, risk factors, pain characteristics.
 * This is a simplified implementation intended for risk stratification; ADP logic must be applied upstream.
 */
export interface EDACSInput {
  age_years: number;
  male: boolean;
  diaphoresis: boolean;
  pain_radiation_to_arm_or_shoulder: boolean;
  pain_worsened_with_inspiration: boolean; // negative points
  pain_reproduced_by_palpation: boolean;   // negative points
  known_risk_factors_count: number; // smoking, HTN, hyperlipidemia, DM, family hx, prior CAD (count)
}

export function runEDACS(i: EDACSInput) {
  let pts = 0;
  // Age banding (0–17)
  if (i.age_years >= 50) pts += 17;
  else if (i.age_years >= 45) pts += 14;
  else if (i.age_years >= 40) pts += 11;

  // Male +6
  if (i.male) pts += 6;

  // Risk factors (4–5 = 4, 3 = 3, 2 = 2, 1 = 1)
  const rf = Math.max(0, Math.min(5, i.known_risk_factors_count));
  if (rf >= 4) pts += 4;
  else pts += rf;

  // Symptoms
  if (i.diaphoresis) pts += 3;
  if (i.pain_radiation_to_arm_or_shoulder) pts += 5;

  // Negative predictors
  if (i.pain_worsened_with_inspiration) pts -= 4;
  if (i.pain_reproduced_by_palpation) pts -= 6;

  return { edacs_points: pts, low_risk_candidate: pts < 16 };
}
