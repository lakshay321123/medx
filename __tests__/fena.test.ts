import { calc_fena } from "../lib/medical/engine/calculators/fena";

describe("calc_fena", () => {
  it("computes FeNa example", () => {
    const v = calc_fena({ urine_na_mmol_l: 10, plasma_na_mmol_l: 140, urine_cr_mg_dl: 100, plasma_cr_mg_dl: 2 });
    // (10 * 2) / (140 * 100) * 100 = 0.142857
    expect(v).toBeCloseTo(0.142857, 4);
  });
});
