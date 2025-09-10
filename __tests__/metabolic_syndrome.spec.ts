import { runMetabolicSyndrome } from "../../lib/medical/engine/calculators/metabolic_syndrome";

test("Metabolic syndrome gating", () => {
  const out = runMetabolicSyndrome({Sex:"M", Waist_cm:105, Triglycerides_mg_dL:200, HDL_mg_dL:35, SBP:140, DBP:90, On_BP_Tx:true, FastingGlucose_mg_dL:110});
  expect(out.count).toBeGreaterThanOrEqual(3);
  expect(out.metabolic_syndrome).toBe(true);
});
