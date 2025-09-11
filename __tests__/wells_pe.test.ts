// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_wells_pe } from "../lib/medical/engine/calculators/wells_pe";

describe("calc_wells_pe", () => {
  it("maxes when all positive", () => {
    const v = calc_wells_pe({ signs_dvt: true, alt_dx_less_likely: true, hr_gt_100: true, immobilization_surgery: true, prior_dvt_pe: true, hemoptysis: true, active_cancer: true });
    expect(v).toBeCloseTo(3+3+1.5+1.5+1.5+1+1, 3);
  });
});
