// Batch 14 test
import { calc_corrected_sodium } from "../lib/medical/engine/calculators/corrected_sodium";

describe("calc_corrected_sodium", () => {
  it("adds 1.6 mEq/L per 100 mg/dL glucose over 100", () => {
    const v = calc_corrected_sodium({ measured_na_mmol_l: 130, glucose_mg_dl: 500 });
    expect(v).toBeCloseTo(130 + 1.6*((500-100)/100), 6);
  });
});
