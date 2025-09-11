// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_pf_ratio } from "../lib/medical/engine/calculators/pf_ratio";

describe("calc_pf_ratio", () => {
  it("divides PaO2 by FiO2", () => {
    const v = calc_pf_ratio({ pao2_mm_hg: 80, fio2: 0.4 });
    expect(v).toBeCloseTo(200, 3);
  });
});
