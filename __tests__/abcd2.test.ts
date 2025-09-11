// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_abcd2 } from "../lib/medical/engine/calculators/abcd2";

describe("calc_abcd2", () => {
  it("scores to max of 7", () => {
    const v = calc_abcd2({ age_ge_60: true, bp_ge_140_90: true, clinical: "weakness", duration_min: 90, diabetes: true });
    expect(v).toBe(7);
  });
});
