// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_feurea } from "../lib/medical/engine/calculators/feurea";

describe("calc_feurea", () => {
  it("computes FEUrea %", () => {
    const v = calc_feurea({ uurea_mg_dl: 300, purea_mg_dl: 40, ucr_mg_dl: 100, pcr_mg_dl: 2 });
    expect(v).toBeCloseTo((300*2)/(40*100)*100, 6);
  });
});
