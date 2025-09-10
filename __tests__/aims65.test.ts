
import { test, expect } from "@jest/globals";
import { runAIMS65 } from "../lib/medical/engine/calculators/aims65";

test("AIMS65 typical high", () => {
  const out = runAIMS65({ albumin_g_dL:2.5, inr:1.8, altered_mental_status:true, sbp_mmHg:85, age_years:70 });
  expect(out.points).toBe(5);
});
