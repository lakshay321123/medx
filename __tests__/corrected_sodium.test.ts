import { calc_corrected_sodium } from "../lib/medical/engine/calculators/corrected_sodium";

describe("calc_corrected_sodium", () => {
  it("adds 1.6 per 100 mg/dL over 100 by default", () => {
    const v = calc_corrected_sodium({ measured_na_mmol_l: 130, glucose_mg_dl: 500 });
    expect(v).toBeCloseTo(130 + 1.6*((500-100)/100), 6);
  });
  it("respects custom factor", () => {
    const v = calc_corrected_sodium({ measured_na_mmol_l: 130, glucose_mg_dl: 500, factor_per_100: 2.4 });
    expect(v).toBeCloseTo(130 + 2.4*((500-100)/100), 6);
  });
});
