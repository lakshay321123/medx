  import { calc_sodium_correction_hyperglycemia } from "../lib/medical/engine/calculators/sodium_correction_hyperglycemia";

  describe("calc_sodium_correction_hyperglycemia", () => {

it("corrects sodium with default factor", () => {
  const r = calc_sodium_correction_hyperglycemia({ measured_na_mmol_l: 130, glucose_mg_dl: 500 });
  expect(r.corrected).toBeCloseTo(136.4, 1);
  expect(r.factor).toBeCloseTo(1.6, 1);
});

  });
