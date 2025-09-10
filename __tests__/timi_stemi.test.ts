import { test, expect } from "@jest/globals";
import { runTIMI_STEMI } from "../lib/medical/engine/calculators/timi_stemi";

test("TIMI STEMI scoring", () => {
  const out = runTIMI_STEMI({ age_years: 78, diabetes_htn_or_angina: true, sbp_mmHg: 90, hr_bpm: 110, killip_class: 3, weight_kg: 60, anterior_stemior_lbbb: true, time_to_treatment_hours: 5 });
  expect(out.points).toBeGreaterThanOrEqual(12);
  expect(out.components.age).toBe(3);
  expect(out.components.sbp).toBe(3);
});
