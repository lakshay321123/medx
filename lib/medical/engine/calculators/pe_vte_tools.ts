// lib/medical/engine/calculators/pe_vte_tools.ts
import { round } from "./utils";

/* --------------------------- Revised Geneva (full) -------------------------- */
export interface RevisedGenevaInput {
  age_gt_65: boolean;
  previous_dvt_pe: boolean;
  surgery_fracture_within_1mo: boolean;
  active_malignancy: boolean;
  unilateral_lower_limb_pain: boolean;
  hemoptysis: boolean;
  heart_rate_bpm: number;
  pain_on_deep_venous_palpation_and_unilateral_edema: boolean;
}

export function runRevisedGeneva(i: RevisedGenevaInput) {
  let pts = 0;
  pts += i.age_gt_65 ? 1 : 0;
  pts += i.previous_dvt_pe ? 3 : 0;
  pts += i.surgery_fracture_within_1mo ? 2 : 0;
  pts += i.active_malignancy ? 2 : 0;
  pts += i.unilateral_lower_limb_pain ? 3 : 0;
  pts += i.hemoptysis ? 2 : 0;
  pts += i.heart_rate_bpm >= 95 ? 5 : (i.heart_rate_bpm >= 75 ? 3 : 0);
  pts += i.pain_on_deep_venous_palpation_and_unilateral_edema ? 4 : 0;

  const band = pts >= 11 ? "high" : pts >= 4 ? "intermediate" : "low";
  return { revised_geneva_points: pts, risk_band: band as "low"|"intermediate"|"high" };
}

/* -------------------------------- Wells DVT -------------------------------- */
export interface WellsDVTInput {
  active_cancer: boolean;
  paralysis_or_recent_immobilization: boolean;
  bedridden_3d_or_major_surgery_12w: boolean;
  localized_tenderness_deep_veins: boolean;
  entire_leg_swollen: boolean;
  calf_swelling_gt_3cm: boolean;
  pitting_edema_confined: boolean;
  collateral_superficial_veins: boolean;
  previous_dvt: boolean;
  alternative_dx_as_likely: boolean; // this subtracts 2
}

export function runWellsDVT(i: WellsDVTInput) {
  let pts = 0;
  pts += i.active_cancer ? 1 : 0;
  pts += i.paralysis_or_recent_immobilization ? 1 : 0;
  pts += i.bedridden_3d_or_major_surgery_12w ? 1 : 0;
  pts += i.localized_tenderness_deep_veins ? 1 : 0;
  pts += i.entire_leg_swollen ? 1 : 0;
  pts += i.calf_swelling_gt_3cm ? 1 : 0;
  pts += i.pitting_edema_confined ? 1 : 0;
  pts += i.collateral_superficial_veins ? 1 : 0;
  pts += i.previous_dvt ? 1 : 0;
  pts -= i.alternative_dx_as_likely ? 2 : 0;

  const band = pts >= 3 ? "likely" : "unlikely";
  return { wells_dvt_points: pts, probability: band as "likely"|"unlikely" };
}

/* ---------------------------------- BOVA ----------------------------------- */
export interface BOVAInput {
  sbp_mmHg: number;
  heart_rate_bpm: number;
  rv_dysfunction: boolean; // imaging or echo
  troponin_elevated: boolean;
}

export function runBOVA(i: BOVAInput) {
  let pts = 0;
  pts += (i.heart_rate_bpm >= 110) ? 2 : 0;
  // BOVA assigns points for SBP 90–100; here we count ≤100 as 2 (do not include shock flows)
  pts += (i.sbp_mmHg <= 100) ? 2 : 0;
  pts += i.rv_dysfunction ? 2 : 0;
  pts += i.troponin_elevated ? 2 : 0;

  let stage: 1|2|3 = 1;
  if (pts >= 5) stage = 3;
  else if (pts >= 3) stage = 2;

  return { bova_points: pts, bova_stage: stage };
}

/* --------------------------------- Hestia ---------------------------------- */
export interface HestiaInput {
  active_bleeding: boolean;
  hemodynamic_instability: boolean;
  need_for_thrombolysis_or_embolectomy: boolean;
  need_for_iv_pain_medication: boolean;
  creatinine_clearance_lt_30: boolean;
  severe_liver_impairment: boolean;
  platelet_lt_75k: boolean;
  pregnancy: boolean;
  social_issues_or_no_support: boolean;
  oxygen_sat_lt_90_on_room_air: boolean;
}

export function runHestia(i: HestiaInput) {
  const flags = Object.values(i).some(Boolean);
  return { outpatient_eligible: !flags, any_exclusion: flags };
}
