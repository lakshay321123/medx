import { calc_shock_index } from "../lib/medical/engine/calculators/shock_index";

describe("calc_shock_index", () => {
  it("hr/sbp", () -> {
    const v = calc_shock_index({ hr_bpm: 90, sbp_mm_hg: 120 });
    expect(v).toBeCloseTo(0.75, 6);
  });
});
