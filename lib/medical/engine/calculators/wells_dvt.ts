
// lib/medical/engine/calculators/wells_dvt.ts
// Wells score for DVT likelihood.

export interface WellsDVTInput {
  active_cancer: boolean;
  paralysis_or_recent_immobilization_of_lower_extremities: boolean;
  recently_bedridden_ge_3_days_or_major_surgery_within_12_weeks: boolean;
  localized_tenderness_along_deep_veins: boolean;
  entire_leg_swollen: boolean;
  calf_swelling_gt_3cm_compared_to_asymptomatic: boolean;
  pitting_edema_confined_to_symptomatic_leg: boolean;
  collateral_superficial_veins: boolean;
  previously_documented_dvt: boolean;
  alternative_diagnosis_at_least_as_likely: boolean; // subtract 2 if true
}

export interface WellsDVTOutput {
  points: number;
  interpretation: "DVT unlikely" | "DVT likely" | "low" | "moderate" | "high";
  components: Record<string, number>;
}

export function runWellsDVT(i: WellsDVTInput): WellsDVTOutput {
  const comp: Record<string, number> = {};
  const pos = [
    ["active_cancer", i.active_cancer],
    ["paralysis_or_recent_immobilization_of_lower_extremities", i.paralysis_or_recent_immobilization_of_lower_extremities],
    ["recently_bedridden_ge_3_days_or_major_surgery_within_12_weeks", i.recently_bedridden_ge_3_days_or_major_surgery_within_12_weeks],
    ["localized_tenderness_along_deep_veins", i.localized_tenderness_along_deep_veins],
    ["entire_leg_swollen", i.entire_leg_swollen],
    ["calf_swelling_gt_3cm_compared_to_asymptomatic", i.calf_swelling_gt_3cm_compared_to_asymptomatic],
    ["pitting_edema_confined_to_symptomatic_leg", i.pitting_edema_confined_to_symptomatic_leg],
    ["collateral_superficial_veins", i.collateral_superficial_veins],
    ["previously_documented_dvt", i.previously_documented_dvt],
  ] as const;
  let total = 0;
  for (const [k, v] of pos) {
    comp[k] = v ? 1 : 0;
    if (v) total += 1;
  }
  comp.alternative_diagnosis = i.alternative_diagnosis_at_least_as_likely ? -2 : 0;
  if (i.alternative_diagnosis_at_least_as_likely) total -= 2;

  // Two common interpretations:
  // (A) Dichotomous: ≥2 likely, <2 unlikely.
  // (B) 3-tier: ≥3 high, 1–2 moderate, 0 low.
  let interp: WellsDVTOutput["interpretation"];
  if (total >= 3) interp = "high";
  else if (total >= 1) interp = "moderate";
  else interp = "low";
  // Also report the dichotomy for convenience:
  if (total >= 2) interp = "DVT likely"; else if (total < 2) interp = "DVT unlikely";

  return { points: total, interpretation: interp, components: comp };
}
