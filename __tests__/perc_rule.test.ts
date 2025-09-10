  import { calc_perc } from "../lib/medical/engine/calculators/perc_rule";

  describe("calc_perc", () => {

it("is PERC negative when all criteria are absent", () => {
  const v = calc_perc({
    age_years: 40, heart_rate: 80, spo2_percent: 98,
    hemoptysis: false, estrogen_use: false, prior_dvt_pe: false,
    unilateral_leg_swelling: false, recent_surgery_trauma: false
  });
  expect(v).toBe(0);
});

  });
