import { calc_homa_ir } from "../lib/medical/engine/calculators/homa_ir";

describe("calc_homa_ir", () => {
  it("converts mg/dL to mmol/L correctly and computes HOMA-IR", () => {
    const v = calc_homa_ir({ fasting_glucose_mg_dl: 90, fasting_insulin_uU_ml: 10 });
    // 90 mg/dL = 5.0 mmol/L; HOMA = 5 * 10 / 22.5 = 2.2222
    expect(v).toBeCloseTo(2.2222, 3);
  });
});
