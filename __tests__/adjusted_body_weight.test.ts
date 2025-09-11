// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_adjusted_body_weight } from "../lib/medical/engine/calculators/adjusted_body_weight";

describe("calc_adjusted_body_weight", () => {
  it("uses 0.4 correction when actual > IBW", () => {
    const r = calc_adjusted_body_weight({ sex: "male", height_cm: 180, actual_weight_kg: 100 });
    expect(r.adjbw).toBeGreaterThan(80);
    expect(r.adjbw).toBeLessThan(100);
  });
});
