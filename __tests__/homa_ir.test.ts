// Batch 14 test
import { calc_homa_ir } from "../lib/medical/engine/calculators/homa_ir";

describe("calc_homa_ir", () => {
  it("computes insulin*glucose/405", () => {
    const v = calc_homa_ir({ fasting_insulin_uU_ml: 10, fasting_glucose_mg_dl: 100 });
    expect(v).toBeCloseTo(10*100/405, 6);
  });
});
