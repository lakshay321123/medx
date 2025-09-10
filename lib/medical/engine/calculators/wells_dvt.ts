// lib/medical/engine/calculators/wells_dvt.ts
// Wells score for DVT probability.

export interface WellsDVTInput {
  active_cancer?: boolean | null;
  paralysis_paresis_or_recent_plaster_immobilization?: boolean | null;
  recently_bedridden_gt_3d_or_major_surgery_within_12w?: boolean | null;
  localized_tenderness_along_deep_veins?: boolean | null;
  entire_leg_swollen?: boolean | null;
  calf_swelling_gt_3cm?: boolean | null;
  pitting_edema_confined_to_symptomatic_leg?: boolean | null;
  collateral_superficial_veins_nonvaricose?: boolean | null;
  alternative_diagnosis_as_likely_or_more_likely?: boolean | null;
}

export interface WellsDVTOutput {
  points: number;
  category: "unlikely" | "likely";
  components: Record<string, number>;
}

export function runWellsDVT(i: WellsDVTInput): WellsDVTOutput {
  const comp: Record<string, number> = {};
  comp.active_cancer = i.active_cancer ? 1 : 0;
  comp.paralysis_or_immob = i.paralysis_paresis_or_recent_plaster_immobilization ? 1 : 0;
  comp.bedridden_or_surgery = i.recently_bedridden_gt_3d_or_major_surgery_within_12w ? 1 : 0;
  comp.tenderness = i.localized_tenderness_along_deep_veins ? 1 : 0;
  comp.entire_leg_swollen = i.entire_leg_swollen ? 1 : 0;
  comp.calf_swelling = i.calf_swelling_gt_3cm ? 1 : 0;
  comp.pitting_edema = i.pitting_edema_confined_to_symptomatic_leg ? 1 : 0;
  comp.collateral_veins = i.collateral_superficial_veins_nonvaricose ? 1 : 0;
  comp.alt_dx = i.alternative_diagnosis_as_likely_or_more_likely ? -2 : 0;

  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  const category = pts >= 2 ? "likely" : "unlikely";
  return { points: pts, category, components: comp };
}
