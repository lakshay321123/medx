
import { test, expect } from "@jest/globals";
import { runHeartPathway } from "../lib/medical/engine/calculators/heart_pathway";

test("HEART Pathway low risk example", () => {
  const out = runHeartPathway({
    history_score: 0, ecg_score: 0, age_years: 52, risk_factors_count: 0,
    known_atherosclerotic_disease: false, troponin0: 9, troponin3h: 8, troponin_uln: 14
  });
  expect(out.heart_score_total).toBeLessThanOrEqual(3);
  expect(out.both_troponins_negative).toBe(true);
  expect(out.heart_pathway_low_risk).toBe(true);
});
