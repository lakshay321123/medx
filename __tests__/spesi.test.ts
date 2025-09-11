import { calc_spesi } from "../lib/medical/engine/calculators/spesi";

describe("calc_spesi", () => {
  it("scores 0 for truly low-risk", () => {
    const v = calc_spesi({ age_years: 50, cancer: false, chronic_cardiopulm: false, heart_rate_bpm: 80, sbp_mm_hg: 120, sao2_percent: 98 });
    expect(v).toBe(0);
  });
  it("scores >=1 when any risk factor present", () => {
    const v = calc_spesi({ age_years: 85, cancer: false, chronic_cardiopulm: false, heart_rate_bpm: 80, sbp_mm_hg: 120, sao2_percent: 98 });
    expect(v).toBe(1);
  });
});
