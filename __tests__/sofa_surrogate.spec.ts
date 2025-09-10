
import { runSOFASurrogate } from "../lib/medical/engine/calculators/sofa_surrogate";

test("SOFA surrogate totals subscores correctly", () => {
  const out = runSOFASurrogate({
    PaO2:60, FiO2:0.9, ventilatory_support:true,
    Platelets_k:40, Bilirubin_mg_dL:6.5,
    MAP:55, norepi_ug_kg_min:0.12,
    GCS:8,
    Creatinine_mg_dL:3.8, Urine_mL_day:300
  })!;
  expect(out.components_counted).toBeGreaterThanOrEqual(5);
  expect(out.total).toBeGreaterThanOrEqual(12);
});
