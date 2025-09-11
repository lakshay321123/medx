import { calc_has_bled } from "../lib/medical/engine/calculators/has_bled";

describe("calc_has_bled", () => {
  it("sums risk factors correctly", () => {
    const v = calc_has_bled({
      age_years: 70, htn_sbp_gt_160: true, abnormal_renal: true, abnormal_liver: false,
      stroke_history: false, bleeding_history: true, labile_inr: true,
      drugs_predisposing: false, alcohol_excess: true
    });
    expect(v).toBe(6);
  });
});
