import { runHOMA_IR } from "@/lib/medical/engine/calculators/homa_ir";

test("HOMA-IR units", () => {
  const mg = runHOMA_IR({ fasting_insulin_uU_ml:10, fasting_glucose_value:100, glucose_unit:"mgdl" });
  expect(mg.homa_ir).toBeCloseTo(10*100/405, 4);
  const mmol = runHOMA_IR({ fasting_insulin_uU_ml:10, fasting_glucose_value:5.5, glucose_unit:"mmoll" });
  expect(mmol.homa_ir).toBeCloseTo(10*5.5/22.5, 4);
});
