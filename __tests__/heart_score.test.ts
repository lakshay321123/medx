import { calc_heart } from "../lib/medical/engine/calculators/heart_score";

describe("calc_heart", () => {
  it("computes a high-risk example", () => {
    const v = calc_heart({
      history: "high", ecg: "st_depression", age_years: 70, risk_factors_count: 3,
      known_atherosclerotic_disease: false, troponin_multiple_uln: 4
    });
    expect(v).toBe(2+2+2+2+2);
  });
});
