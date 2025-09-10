export interface GenevaInput {
  age_ge_65: boolean;
  previous_dvt_pe: boolean;
  surgery_fracture_1mo: boolean;
  active_malignancy: boolean;
  unilateral_lower_limb_pain: boolean;
  hemoptysis: boolean;
  hr_bpm: number;
  pain_on_palpation_and_unilateral_edema: boolean;
}
export function runRevisedGeneva(i: GenevaInput) {
  let score = 0;
  if (i.age_ge_65) score += 1;
  if (i.previous_dvt_pe) score += 3;
  if (i.surgery_fracture_1mo) score += 2;
  if (i.active_malignancy) score += 2;
  if (i.unilateral_lower_limb_pain) score += 3;
  if (i.hemoptysis) score += 2;
  if (i.hr_bpm >= 95) score += 5;
  else if (i.hr_bpm >= 75) score += 3;
  if (i.pain_on_palpation_and_unilateral_edema) score += 4;
  const band = score >= 11 ? "high" : (score >= 4 ? "intermediate" : "low");
  return { score, band };
}

export interface WellsDVTInput {
  active_cancer: boolean;
  paralysis_paresis_or_cast: boolean;
  recently_bedridden_3d_or_surgery_12w: boolean;
  localized_tenderness: boolean;
  entire_leg_swollen: boolean;
  calf_swelling_gt_3cm: boolean;
  pitting_edema_confined: boolean;
  collateral_superficial_veins: boolean;
  alternative_diagnosis_as_likely: boolean;
}
export function runWellsDVT(i: WellsDVTInput) {
  let score = 0;
  if (i.active_cancer) score += 1;
  if (i.paralysis_paresis_or_cast) score += 1;
  if (i.recently_bedridden_3d_or_surgery_12w) score += 1;
  if (i.localized_tenderness) score += 1;
  if (i.entire_leg_swollen) score += 1;
  if (i.calf_swelling_gt_3cm) score += 1;
  if (i.pitting_edema_confined) score += 1;
  if (i.collateral_superficial_veins) score += 1;
  if (i.alternative_diagnosis_as_likely) score -= 2;
  const band = score >= 3 ? "high" : (score >= 1 ? "moderate" : "low");
  return { score, band };
}

export interface BOVAInput {
  sbp_mmHg: number;
  hr_bpm: number;
  troponin_elevated: boolean;
  rv_dysfunction: boolean;
}
export function runBOVA(i: BOVAInput) {
  let score = 0;
  if (i.sbp_mmHg >= 90 && i.sbp_mmHg <= 100) score += 2;
  if (i.hr_bpm >= 110) score += 1;
  if (i.troponin_elevated) score += 2;
  if (i.rv_dysfunction) score += 2;
  const cls = score >= 5 ? "III" : (score >= 3 ? "II" : "I");
  return { score, class: cls };
}

export interface HestiaInput {
  any_criteria_true: boolean; // Provide a single gate (true if ANY exclusion present). Keep detailed mapping in UI.
}
export function runHestia(i: HestiaInput) {
  return { eligible_for_outpatient: !i.any_criteria_true };
}
