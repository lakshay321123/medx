// lib/medical/engine/calculators/revised_geneva.ts
// Revised Geneva score for PE probability.

export interface RevisedGenevaInput {
  age_gt_65?: boolean | null;
  prior_dvt_pe?: boolean | null;
  surgery_fracture_recent?: boolean | null; // within 1 month
  active_malignancy?: boolean | null;
  unilateral_lower_limb_pain?: boolean | null;
  hemoptysis?: boolean | null;
  heart_rate_bpm?: number | null;
  pain_on_deep_vein_palpation_and_unilateral_edema?: boolean | null;
}

export interface RevisedGenevaOutput {
  points: number;
  risk_band: "low" | "intermediate" | "high";
  components: Record<string, number>;
}

export function runRevisedGeneva(i: RevisedGenevaInput): RevisedGenevaOutput {
  const comp: Record<string, number> = {};
  comp.age = i.age_gt_65 ? 1 : 0;
  comp.prior = i.prior_dvt_pe ? 3 : 0;
  comp.surgery = i.surgery_fracture_recent ? 2 : 0;
  comp.malignancy = i.active_malignancy ? 2 : 0;
  comp.unilateral_pain = i.unilateral_lower_limb_pain ? 3 : 0;
  comp.hemoptysis = i.hemoptysis ? 2 : 0;
  const hr = i.heart_rate_bpm ?? 0;
  comp.hr = hr >= 95 ? 5 : (hr >= 75 ? 3 : 0);
  comp.dvt_signs = i.pain_on_deep_vein_palpation_and_unilateral_edema ? 4 : 0;

  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  let band: "low"|"intermediate"|"high" = "low";
  if (pts >= 11) band = "high";
  else if (pts >= 4) band = "intermediate";

  return { points: pts, risk_band: band, components: comp };
}
