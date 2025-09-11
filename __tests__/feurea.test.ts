import { calc_feurea } from "../lib/medical/engine/calculators/feurea";

describe("calc_feurea", () => {
  it("computes FeUrea example", () => {
    const v = calc_feurea({ urine_urea_mg_dl: 300, plasma_urea_mg_dl: 60, urine_cr_mg_dl: 100, plasma_cr_mg_dl: 2 });
    // (300*2)/(60*100)*100 = 10%
    expect(v).toBeCloseTo(10, 3);
  });
});
