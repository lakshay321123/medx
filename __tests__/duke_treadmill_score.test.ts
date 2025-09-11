// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_duke_treadmill } from "../lib/medical/engine/calculators/duke_treadmill_score";

describe("calc_duke_treadmill", () => {
  it("computes DTS", () => {
    const v = calc_duke_treadmill({ exercise_time_min: 9, st_deviation_mm: 2, angina_index: 2 });
    expect(v).toBeCloseTo(9 - 10 - 8, 3);
  });
});
