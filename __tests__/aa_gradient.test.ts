import { calc_aa_gradient } from "../lib/medical/engine/calculators/aa_gradient";

describe("calc_aa_gradient", () => {
  it("computes expected gradient at sea level", () => {
    const v = calc_aa_gradient({ fio2: 0.21, pao2_mm_hg: 80, paco2_mm_hg: 40 });
    // PAO2 ~= 0.21*(760-47) - 40/0.8 = 0.21*713 - 50 = 149.73 - 50 = 99.73; gradient ~ 19.73
    expect(v).toBeCloseTo(19.7, 1);
  });
});
