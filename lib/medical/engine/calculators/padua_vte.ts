/**
 * Padua Prediction Score for VTE in medical inpatients
 * Points:
 * Active cancer 3, Previous VTE 3, Reduced mobility 3, Thrombophilia 3,
 * Recent trauma or surgery less than 1 month 2,
 * Age >= 70 1, Heart or respiratory failure 1, Acute MI or ischemic stroke 1,
 * Acute infection or rheumatologic disorder 1, BMI >= 30 1, Hormonal therapy 1
 * High risk if total >= 4
 */
export interface PaduaInput {
  active_cancer: boolean;
  previous_vte: boolean;
  reduced_mobility: boolean;
  thrombophilia: boolean;
  recent_trauma_or_surgery_lt_1mo: boolean;
  age: number;
  heart_or_respiratory_failure: boolean;
  acute_mi_or_stroke: boolean;
  acute_infection_or_rheum: boolean;
  bmi: number;
  hormonal_therapy: boolean;
}
export interface PaduaResult { score: number; high_risk: boolean; }
export function runPadua(i: PaduaInput): PaduaResult {
  let s = 0;
  if (i.active_cancer) s += 3;
  if (i.previous_vte) s += 3;
  if (i.reduced_mobility) s += 3;
  if (i.thrombophilia) s += 3;
  if (i.recent_trauma_or_surgery_lt_1mo) s += 2;
  if (i.age >= 70) s += 1;
  if (i.heart_or_respiratory_failure) s += 1;
  if (i.acute_mi_or_stroke) s += 1;
  if (i.acute_infection_or_rheum) s += 1;
  if (i.bmi >= 30) s += 1;
  if (i.hormonal_therapy) s += 1;
  return { score: s, high_risk: s >= 4 };
}
