// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_revised_geneva_pe } from "../lib/medical/engine/calculators/revised_geneva_pe";

describe("calc_revised_geneva_pe", () => {
  it("classifies high risk with many factors", () => {
    const r = calc_revised_geneva_pe({
      age_gt_65: true, prior_dvt_pe: true, surgery_fracture_le_1mo: false, active_malignancy: true,
      unilateral_lower_limb_pain: true, hemoptysis: true, hr_bpm: 100,
      pain_on_deep_vein_palpation_and_unilateral_edema: true
    });
    expect(r.score).toBeGreaterThanOrEqual(11);
    expect(r.risk).toBe("high");
  });
});
