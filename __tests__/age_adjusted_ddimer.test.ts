import { test, expect } from "@jest/globals";
import { ageAdjustedDDimer } from "../lib/medical/engine/calculators/age_adjusted_ddimer";

test("Age-adjusted D-dimer FEU", () => {
  const thr = ageAdjustedDDimer(76, 'FEU');
  expect(thr.threshold_ng_mL).toBe(760);
});
