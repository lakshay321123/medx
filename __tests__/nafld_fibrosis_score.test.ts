import { test, expect } from "@jest/globals";
import { runNAFLD_FS } from "../lib/medical/engine/calculators/nafld_fibrosis_score";

test("NAFLD fibrosis score categorization", () => {
  const outLow = runNAFLD_FS({ age_years:30, bmi_kg_m2:22, has_impaired_fasting_glucose_or_diabetes:false, ast_u_L:20, alt_u_L:25, platelets_k_per_uL:300, albumin_g_dL:4.5 });
  expect(outLow.category).toBe("low");
  const outHigh = runNAFLD_FS({ age_years:70, bmi_kg_m2:35, has_impaired_fasting_glucose_or_diabetes:true, ast_u_L:80, alt_u_L:40, platelets_k_per_uL:120, albumin_g_dL:3.0 });
  expect(outHigh.category).toBe("high");
});
