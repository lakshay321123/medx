import { test, expect } from "@jest/globals";
import { runCorrectedNaHyperglycemia } from "../lib/medical/engine/calculators/corrected_sodium_hyperglycemia";

test("Corrected Na (hyperglycemia)", () => {
  const out = runCorrectedNaHyperglycemia({ measured_na_mmol_l: 130, glucose_mg_dl: 500 });
  expect(out.corrected_na_mmol_l).toBeCloseTo(130 + (400*1.6/100), 1);
});
