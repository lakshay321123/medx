import { register } from "../registry";

/**
 * Wells Score for DVT
 */
export function calc_wells_dvt({
  active_cancer,
  paralysis_paresis_recent_plaster,
  recently_bedridden_or_major_surgery,
  localized_tenderness_deep_veins,
  entire_leg_swollen,
  calf_swelling_gt_3cm,
  pitting_edema_symptomatic_leg,
  collateral_superficial_veins,
  alternative_diagnosis_as_likely,
}: {
  active_cancer?: boolean;
  paralysis_paresis_recent_plaster?: boolean;
  recently_bedridden_or_major_surgery?: boolean;
  localized_tenderness_deep_veins?: boolean;
  entire_leg_swollen?: boolean;
  calf_swelling_gt_3cm?: boolean;
  pitting_edema_symptomatic_leg?: boolean;
  collateral_superficial_veins?: boolean;
  alternative_diagnosis_as_likely?: boolean;
}) {
  let s = 0;
  if (active_cancer) s += 1;
  if (paralysis_paresis_recent_plaster) s += 1;
  if (recently_bedridden_or_major_surgery) s += 1;
  if (localized_tenderness_deep_veins) s += 1;
  if (entire_leg_swollen) s += 1;
  if (calf_swelling_gt_3cm) s += 1;
  if (pitting_edema_symptomatic_leg) s += 1;
  if (collateral_superficial_veins) s += 1;
  if (alternative_diagnosis_as_likely) s -= 2;
  return s;
}

function wellsDVTRisk(score: number): string {
  if (score >= 3) return "high probability";
  if (score >= 1) return "moderate probability";
  return "low probability";
}

register({
  id: "wells_dvt",
  label: "Wells Score (DVT)",
  tags: ["vascular", "emergency"],
  inputs: [
    { key: "active_cancer" },
    { key: "paralysis_paresis_recent_plaster" },
    { key: "recently_bedridden_or_major_surgery" },
    { key: "localized_tenderness_deep_veins" },
    { key: "entire_leg_swollen" },
    { key: "calf_swelling_gt_3cm" },
    { key: "pitting_edema_symptomatic_leg" },
    { key: "collateral_superficial_veins" },
    { key: "alternative_diagnosis_as_likely" }
  ],
  run: ({
    active_cancer,
    paralysis_paresis_recent_plaster,
    recently_bedridden_or_major_surgery,
    localized_tenderness_deep_veins,
    entire_leg_swollen,
    calf_swelling_gt_3cm,
    pitting_edema_symptomatic_leg,
    collateral_superficial_veins,
    alternative_diagnosis_as_likely,
  }: {
    active_cancer?: boolean;
    paralysis_paresis_recent_plaster?: boolean;
    recently_bedridden_or_major_surgery?: boolean;
    localized_tenderness_deep_veins?: boolean;
    entire_leg_swollen?: boolean;
    calf_swelling_gt_3cm?: boolean;
    pitting_edema_symptomatic_leg?: boolean;
    collateral_superficial_veins?: boolean;
    alternative_diagnosis_as_likely?: boolean;
  }) => {
    const v = calc_wells_dvt({
      active_cancer,
      paralysis_paresis_recent_plaster,
      recently_bedridden_or_major_surgery,
      localized_tenderness_deep_veins,
      entire_leg_swollen,
      calf_swelling_gt_3cm,
      pitting_edema_symptomatic_leg,
      collateral_superficial_veins,
      alternative_diagnosis_as_likely,
    });
    const notes = [wellsDVTRisk(v)];
    return { id: "wells_dvt", label: "Wells Score (DVT)", value: v, unit: "score", precision: 0, notes };
  },
});
