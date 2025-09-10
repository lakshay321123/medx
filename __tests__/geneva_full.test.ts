
import { test, expect } from "@jest/globals";
import { runRevisedGeneva } from "../lib/medical/engine/calculators/revised_geneva_full";

test("Revised Geneva: high risk sample", () => {
  const out = runRevisedGeneva({
    age_years: 72,
    previous_dvt_pe: true,
    surgery_or_fracture_within_1_month: false,
    active_malignancy: true,
    unilateral_lower_limb_pain: true,
    hemoptysis: true,
    pain_on_lower_limb_palpation_and_unilateral_edema: true,
    heart_rate_bpm: 110
  });
  expect(out.points).toBeGreaterThanOrEqual(11);
  expect(out.risk_band).toBe("high");
});
