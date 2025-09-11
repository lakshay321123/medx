// Batch 14 test
import { calc_braden } from "../lib/medical/engine/calculators/braden_scale";

describe("calc_braden", () => {
  it("computes category cutoffs", () => {
    const r = calc_braden({ sensory: 2, moisture: 2, activity: 2, mobility: 2, nutrition: 2, friction_shear: 2 });
    expect(r.score).toBe(12);
    expect(r.risk).toBe("high");
  });
});
