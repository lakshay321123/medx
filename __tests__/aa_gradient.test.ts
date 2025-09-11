// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_aa_gradient } from "../lib/medical/engine/calculators/aa_gradient";

describe("calc_aa_gradient", () => {
  it("computes alveolar O2 and gradient", () => {
    const r = calc_aa_gradient({ fio2: 0.21, pao2_mm_hg: 90, paco2_mm_hg: 40 });
    const PAO2 = 0.21 * (760 - 47) - (40 / 0.8);
    expect(r.alveolar_o2_mm_hg).toBeCloseTo(PAO2, 2);
    expect(r.gradient_mm_hg).toBeCloseTo(PAO2 - 90, 2);
  });
});
