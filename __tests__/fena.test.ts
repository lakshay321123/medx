// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_fena } from "../lib/medical/engine/calculators/fena";

describe("calc_fena", () => {
  it("computes FENa %", () => {
    const v = calc_fena({ una_mmol_l: 20, pna_mmol_l: 140, ucr_mg_dl: 100, pcr_mg_dl: 2 });
    expect(v).toBeCloseTo((20*2)/(140*100)*100, 6);
  });
});
