// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_henderson_hasselbalch } from "../lib/medical/engine/calculators/henderson_hasselbalch";

describe("calc_henderson_hasselbalch", () => {
  it("computes physiologic pH example ~7.40", () => {
    const v = calc_henderson_hasselbalch({ hco3_mmol_l: 24, paco2_mm_hg: 40 });
    expect(v).toBeCloseTo(7.40, 2);
  });
});
