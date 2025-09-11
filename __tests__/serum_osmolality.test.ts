import { calc_serum_osmolality } from "../lib/medical/engine/calculators/serum_osmolality";

describe("calc_serum_osmolality", () => {
  it("2*Na + glu/18 + bun/2.8 + EtOH/3.7", () => {
    const v = calc_serum_osmolality({ na_mmol_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14, ethanol_mg_dl: 0 });
    expect(v).toBeCloseTo(2*140 + 90/18 + 14/2.8 + 0, 6);
  });
});
