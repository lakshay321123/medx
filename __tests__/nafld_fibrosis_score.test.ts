import { runNAFLD_Fibrosis } from "@/lib/medical/engine/calculators/nafld_fibrosis_score";

test("NAFLD Fibrosis bands", () => {
  const low = runNAFLD_Fibrosis({ age:30, bmi:22, impaired_fasting_glucose_or_diabetes:false, ast_u_l:20, alt_u_l:25, platelets_x10e9_l:300, albumin_g_dl:4.5 });
  expect(low.band).toBe("low");
});
