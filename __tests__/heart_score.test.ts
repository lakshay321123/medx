// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_heart_score } from "../lib/medical/engine/calculators/heart_score";

describe("calc_heart_score", () => {
  it("classifies high risk at >=7", () => {
    const r = calc_heart_score({ history: 2, ecg: 2, age_group: 1, risk_factors: 1, troponin: 1 });
    expect(r.score).toBe(7);
    expect(r.risk).toBe("high");
  });
});
