
import { test, expect } from "@jest/globals";
import { runWellsDVT } from "../lib/medical/engine/calculators/wells_dvt";

test("Wells DVT likely", () => {
  const out = runWellsDVT({
    active_cancer: true,
    paralysis_or_recent_immobilization_of_lower_extremities: false,
    recently_bedridden_ge_3_days_or_major_surgery_within_12_weeks: true,
    localized_tenderness_along_deep_veins: true,
    entire_leg_swollen: false,
    calf_swelling_gt_3cm_compared_to_asymptomatic: true,
    pitting_edema_confined_to_symptomatic_leg: true,
    collateral_superficial_veins: false,
    previously_documented_dvt: false,
    alternative_diagnosis_at_least_as_likely: false
  });
  expect(out.points).toBeGreaterThanOrEqual(4);
  expect(out.interpretation.includes("likely")).toBe(true);
});
