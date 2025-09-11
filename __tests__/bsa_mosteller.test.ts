// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_bsa_mosteller } from "../lib/medical/engine/calculators/bsa_mosteller";

describe("calc_bsa_mosteller", () => {
  it("computes sqrt(h*wt/3600)", () => {
    const v = calc_bsa_mosteller({ height_cm: 180, weight_kg: 80 });
    expect(v).toBeCloseTo(Math.sqrt(180*80/3600), 6);
  });
});
