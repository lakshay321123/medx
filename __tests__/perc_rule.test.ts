// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_perc_rule } from "../lib/medical/engine/calculators/perc_rule";

describe("calc_perc_rule", () => {
  it("is negative only when all criteria satisfied", () => {
    const r = calc_perc_rule({ age_lt_50: true, hr_lt_100: true, sao2_ge_95: true, no_hemoptysis: true, no_estrogen_use: true, no_prior_dvt_pe: true, no_unilateral_leg_swelling: true, no_recent_surgery_or_trauma: true });
    expect(r.positive_count).toBe(8);
    expect(r.perc_negative).toBe(true);
  });
});
