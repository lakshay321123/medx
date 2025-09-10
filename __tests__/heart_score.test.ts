import { test, expect } from "@jest/globals";
import { runHEART } from "../lib/medical/engine/calculators/heart_score";

test("HEART moderate case", () => {
  const out = runHEART({ history_level: 1, ecg_level: 1, age_years: 60, risk_factors_count: 2, troponin_multiple_of_uln: 1.5 });
  expect(out.points).toBe(6);
  expect(out.components.age).toBe(1);
});
