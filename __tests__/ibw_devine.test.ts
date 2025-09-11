// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_ibw_devine } from "../lib/medical/engine/calculators/ibw_devine";

describe("calc_ibw_devine", () => {
  it("computes male 180 cm example", () => {
    const v = calc_ibw_devine({ sex: "male", height_cm: 180 });
    const inches = 180/2.54;
    const over60 = Math.max(inches - 60, 0);
    expect(v).toBeCloseTo(50 + 2.3 * over60, 2);
  });
});
