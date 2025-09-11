import { calc_wells_pe } from "../lib/medical/engine/calculators/wells_pe";

describe("calc_wells_pe", () => {
  it("handles 1.5-point items", () => {
    const v = calc_wells_pe({
      signs_dvt: true, pe_more_likely_than_alt: true, heart_rate_gt_100: true,
      immob_surgery_4w: false, previous_dvt_pe: true, hemoptysis: false, malignancy: true
    });
    expect(v).toBeCloseTo(3+3+1.5+0+1.5+0+1, 5);
  });
});
