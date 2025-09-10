
// lib/medical/engine/calculators/revised_geneva_full.ts
// Revised Geneva Score (full) for PE probability (2006/2008 version)

export interface GenevaInput {
  age_years: number;
  previous_dvt_pe: boolean;
  surgery_or_fracture_within_1_month: boolean;
  active_malignancy: boolean;
  unilateral_lower_limb_pain: boolean;
  hemoptysis: boolean;
  pain_on_lower_limb_palpation_and_unilateral_edema: boolean;
  heart_rate_bpm: number;
}

export interface GenevaOutput {
  points: number;
  risk_band: "low" | "intermediate" | "high";
  components: Record<string, number>;
}

function hrPoints(hr: number): number {
  if (hr >= 95) return 5;
  if (hr >= 75) return 3;
  return 0;
}

export function runRevisedGeneva(i: GenevaInput): GenevaOutput {
  const comp: Record<string, number> = {};
  comp.age = i.age_years >= 65 ? 1 : 0;
  comp.prev = i.previous_dvt_pe ? 3 : 0;
  comp.surg = i.surgery_or_fracture_within_1_month ? 2 : 0;
  comp.cancer = i.active_malignancy ? 2 : 0;
  comp.unilat_pain = i.unilateral_lower_limb_pain ? 3 : 0;
  comp.hemo = i.hemoptysis ? 2 : 0;
  comp.palp_edema = i.pain_on_lower_limb_palpation_and_unilateral_edema ? 4 : 0;
  comp.hr = hrPoints(i.heart_rate_bpm);
  const total = Object.values(comp).reduce((a,b)=>a+b,0);

  let band: "low"|"intermediate"|"high" = "low";
  if (total >= 11) band = "high";
  else if (total >= 4) band = "intermediate";

  return { points: total, risk_band: band, components: comp };
}
