// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_map } from "../lib/medical/engine/calculators/map_calc";

describe("calc_map", () => {
  it("computes (SBP + 2*DBP)/3", () => {
    const v = calc_map({ sbp_mm_hg: 120, dbp_mm_hg: 80 });
    expect(v).toBeCloseTo((120 + 160)/3, 4);
  });
});
