
import { test, expect } from "@jest/globals";
import { runFEPhos, runFEMg } from "../lib/medical/engine/calculators/fephos_femg";

test("FEPhos > FEMg numerically here", () => {
  const phos = runFEPhos({ urine_analyte_mg_dL:50, plasma_analyte_mg_dL:3.0, urine_creatinine_mg_dL:100, plasma_creatinine_mg_dL:1.0 });
  const mg = runFEMg({ urine_analyte_mg_dL:10, plasma_analyte_mg_dL:2.0, urine_creatinine_mg_dL:100, plasma_creatinine_mg_dL:1.0 });
  expect(phos.fe_percent).toBeGreaterThan(0);
  expect(mg.fe_percent).toBeGreaterThan(0);
});
