// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_winters } from "../lib/medical/engine/calculators/winters_formula";

describe("calc_winters", () => {
  it("computes expected PaCO2 and range", () => {
    const r = calc_winters({ hco3_mmol_l: 12 });
    expect(r.expected_paco2_mm_hg).toBeCloseTo(1.5*12 + 8, 6);
    expect(r.low).toBeCloseTo(r.expected_paco2_mm_hg - 2, 6);
    expect(r.high).toBeCloseTo(r.expected_paco2_mm_hg + 2, 6);
  });
});
