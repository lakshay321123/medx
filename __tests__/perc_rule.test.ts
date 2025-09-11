import { calc_perc } from "../lib/medical/engine/calculators/perc_rule";

describe("calc_perc", () => {
  it("is negative when all criteria absent", () => {
    const v = calc_perc({
      age_ge_50: false, hr_ge_100: false, sao2_lt_95: false, hemoptysis: false,
      estrogen_use: false, prior_dvt_pe: false, unilateral_leg_swelling: false, recent_surgery_trauma: false
    });
    expect(v).toBe(0);
  });
});
