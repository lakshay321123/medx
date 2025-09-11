import { calc_homa_ir } from "../lib/medical/engine/calculators/homa_ir";

describe("calc_homa_ir", () => {
  it("glucose*insulin/405", () => {
    const v = calc_homa_ir({ fasting_glucose_mg_dl: 100, fasting_insulin_uU_ml: 10 });
    expect(v).toBeCloseTo((100*10)/405, 6);
  });
});
