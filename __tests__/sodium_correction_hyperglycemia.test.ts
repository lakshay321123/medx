import { calc_corrected_na } from "../lib/medical/engine/calculators/sodium_correction_hyperglycemia";

describe("calc_corrected_na", () => {
  it("adds 1.6 per 100 mg/dL over 100", () => {
    const v = calc_corrected_na({ measured_na_mmol_l: 130, glucose_mg_dl: 500 });
    expect(v).toBeCloseTo(130 + 1.6 * ((500 - 100) / 100), 3);
  });
});
