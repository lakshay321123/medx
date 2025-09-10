import { test, expect } from "@jest/globals";
import { runRevisedGeneva } from "../lib/medical/engine/calculators/revised_geneva";

test("Revised Geneva intermediate", () => {
  const out = runRevisedGeneva({
    age_gt_65: true, prior_dvt_pe: false, surgery_fracture_recent: true, active_malignancy: false,
    unilateral_lower_limb_pain: true, hemoptysis: false, heart_rate_bpm: 80,
    pain_on_deep_vein_palpation_and_unilateral_edema: false
  });
  expect(out.points).toBe(1 + 2 + 3 + 3); // age 1 + surgery 2 + unilateral pain 3 + HR 75-94 is 3
  expect(out.risk_band).toBe("intermediate");
});
