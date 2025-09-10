import { test, expect } from "@jest/globals";
import { runAIMS65 } from "../lib/medical/engine/calculators/aims65";

test("AIMS65 typical high score", () => {
  const out = runAIMS65({ albumin_g_dL: 2.8, inr: 1.8, altered_mental_status: true, sbp_mmHg: 85, age_years: 70 });
  expect(out.points).toBe(5);
  expect(out.flags.alb_lt_3).toBe(true);
});

test("AIMS65 zero", () => {
  const out = runAIMS65({ albumin_g_dL: 3.6, inr: 1.0, altered_mental_status: false, sbp_mmHg: 118, age_years: 40 });
  expect(out.points).toBe(0);
});
