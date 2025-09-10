  import { calc_heart_score } from "../lib/medical/engine/calculators/heart_score";

  describe("calc_heart_score", () => {

it("classifies low risk (HEART=3)", () => {
  const r = calc_heart_score({
    history_level: 1,
    ecg_level: 0,
    age_years: 50,
    risk_factors_count: 1,
    known_atherosclerosis: false,
    troponin_multiple_uln: 0.9,
  });
  expect(r.total).toBe(3);
  expect(r.risk).toBe("low");
});

it("classifies high risk (HEART=10)", () => {
  const r = calc_heart_score({
    history_level: 2,
    ecg_level: 2,
    age_years: 70,
    risk_factors_count: 3,
    known_atherosclerosis: false,
    troponin_multiple_uln: 4.0,
  });
  expect(r.total).toBe(10);
  expect(r.risk).toBe("high");
});

  });
