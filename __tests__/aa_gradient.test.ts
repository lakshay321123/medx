import { calc_aa_gradient } from "../lib/medical/engine/calculators/aa_gradient";

describe("calc_aa_gradient", () => {
  it("computes PAO2 via alveolar gas equation", () => {
    const r = calc_aa_gradient({ fio2: 0.21, pao2_mm_hg: 80, paco2_mm_hg: 40 });
    expect(r.alveolar_o2).toBeGreaterThan(0);
    expect(r.aa).toBeDefined();
  });
});
