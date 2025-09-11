import { calc_heart_score } from "../lib/medical/engine/calculators/heart_score";

describe("calc_heart_score", () => {
  it("classifies risk bands", () => {
    const r = calc_heart_score({ history: 2, ecg: 2, age: 2, risk_factors: 2, troponin: 2 });
    expect(r.score).toBe(10);
    expect(r.risk).toBe("high");
  });
});
