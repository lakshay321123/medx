import { calc_corrected_sodium_hyperglycemia } from "../lib/medical/engine/calculators/corrected_sodium_hyperglycemia";

describe("calc_corrected_sodium_hyperglycemia", () => {
  it("adds 1.6 per 100 mg/dL above 100", () => {
    const v = calc_corrected_sodium_hyperglycemia({ measured_na_mmol_l: 130, glucose_mg_dl: 300 });
    expect(v).toBeCloseTo(130 + (200/100)*1.6, 6);
  });
});
