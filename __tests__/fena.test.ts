import { calc_fena } from "../lib/medical/engine/calculators/fena";

describe("calc_fena", () => {
  it("computes (Una*Pcr)/(Pna*Ucr)*100", () => {
    const v = calc_fena({ urine_na_mmol_l: 20, plasma_na_mmol_l: 140, urine_cr_mg_dl: 100, plasma_cr_mg_dl: 2 });
    expect(v).toBeCloseTo((20*2)/(140*100)*100, 6);
  });
});
