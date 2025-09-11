import { calc_shock_index } from "../lib/medical/engine/calculators/shock_index";

describe("calc_shock_index", () => {
  it("is HR/SBP", () => {
    const v = calc_shock_index({ hr_bpm: 120, sbp_mm_hg: 100 });
    expect(v).toBeCloseTo(1.2, 6);
  });
});
