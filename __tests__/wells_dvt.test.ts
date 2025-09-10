import { test, expect } from "@jest/globals";
import { runWellsDVT } from "../lib/medical/engine/calculators/wells_dvt";

test("Wells DVT likely", () => {
  const out = runWellsDVT({
    active_cancer: true,
    paralysis_paresis_or_recent_plaster_immobilization: false,
    recently_bedridden_gt_3d_or_major_surgery_within_12w: true,
    localized_tenderness_along_deep_veins: true,
    entire_leg_swollen: false,
    calf_swelling_gt_3cm: true,
    pitting_edema_confined_to_symptomatic_leg: false,
    collateral_superficial_veins_nonvaricose: true,
    alternative_diagnosis_as_likely_or_more_likely: false
  });
  expect(out.points).toBeGreaterThanOrEqual(4);
  expect(out.category).toBe("likely");
});
