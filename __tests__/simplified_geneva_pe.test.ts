// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_simplified_geneva_pe } from "../lib/medical/engine/calculators/simplified_geneva_pe";

describe("calc_simplified_geneva_pe", () => {
  it("adds one point per item and classifies risk", () => {
    const r = calc_simplified_geneva_pe({
      age_gt_65: true, prior_dvt_pe: true, surgery_fracture_le_1mo: true, active_malignancy: false,
      unilateral_lower_limb_pain: true, hemoptysis: false, hr_gt_75: true,
      pain_on_deep_vein_palpation_and_unilateral_edema: true
    });
    expect(r.score).toBe(7 - 2); // two falses
    expect(r.risk).toBe("high");
  });
});
