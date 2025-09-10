import { test, expect } from "@jest/globals";
import { runCharlson } from "../lib/medical/engine/calculators/charlson";

test("Charlson with multiple comorbidities and age 72", () => {
  const out = runCharlson({ age_years:72, chf:true, copd:true, diabetes_end_organ:true, malignancy:true });
  expect(out.comorbidity_points).toBe(1 + 1 + 2 + 2); // CHF + COPD + DM end-organ + malignancy
  expect(out.age_points).toBe(3);
  expect(out.total_points).toBe(out.comorbidity_points + out.age_points);
});
