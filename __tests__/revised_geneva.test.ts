import { revisedGeneva } from "../lib/medical/engine/calculators/revised_geneva";

test("Revised Geneva bands", () => {
  const low = revisedGeneva({
    age_gt_65: false, previous_vte: false, surgery_or_fracture_past_month: false,
    active_cancer: false, unilateral_leg_pain: false, hemoptysis: false,
    heart_rate: 70, pain_on_dvp_and_unilateral_edema: false
  });
  expect(low.band).toBe("low");

  const mid = revisedGeneva({
    age_gt_65: true, previous_vte: true, surgery_or_fracture_past_month: false,
    active_cancer: false, unilateral_leg_pain: true, hemoptysis: false,
    heart_rate: 80, pain_on_dvp_and_unilateral_edema: false
  });
  expect(mid.band).toBe("intermediate");

  const hi = revisedGeneva({
    age_gt_65: true, previous_vte: true, surgery_or_fracture_past_month: true,
    active_cancer: true, unilateral_leg_pain: true, hemoptysis: true,
    heart_rate: 110, pain_on_dvp_and_unilateral_edema: true
  });
  expect(hi.band).toBe("high");
});
