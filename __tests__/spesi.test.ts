import { calc_spesi } from "../lib/medical/engine/calculators/spesi";

describe("calc_spesi", () => {
  it("is low risk only at score 0", () => {
    const low = calc_spesi({ age_years: 50, cancer: false, chronic_cardiopulmonary: false, hr_bpm: 80, sbp_mm_hg: 120, spo2_percent: 95 });
    const high = calc_spesi({ age_years: 85, cancer: false, chronic_cardiopulmonary: false, hr_bpm: 80, sbp_mm_hg: 120, spo2_percent: 95 });
    expect(low.risk).toBe("low");
    expect(high.risk).toBe("high");
  });
});
