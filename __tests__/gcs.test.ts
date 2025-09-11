// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_gcs } from "../lib/medical/engine/calculators/gcs";

describe("calc_gcs", () => {
  it("sums subscores", () => {
    const v = calc_gcs({ eye: 3, verbal: 4, motor: 5 });
    expect(v).toBe(12);
  });
});
