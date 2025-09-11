// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_has_bled } from "../lib/medical/engine/calculators/has_bled";

describe("calc_has_bled", () => {
  it("sums risk factors", () => {
    const v = calc_has_bled({ uncontrolled_htn_sbp_gt_160: true, abnormal_renal: true, abnormal_liver: false, stroke_history: true, bleeding_history: true, labile_inr: false, age_gt_65: true, drugs: true, alcohol: false });
    expect(v).toBe(6);
  });
});
