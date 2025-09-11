import { calc_abcd2 } from "../lib/medical/engine/calculators/abcd2";

describe("calc_abcd2", () => {
  it("computes a typical high-risk example", () => {
    const v = calc_abcd2({
      age_years: 70, sbp_mm_hg: 150, dbp_mm_hg: 95,
      unilateral_weakness: true, speech_disturbance_without_weakness: false,
      duration_minutes: 75, diabetes: true
    });
    expect(v).toBe(7);
  });
});
