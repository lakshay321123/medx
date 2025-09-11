// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_shock_index, calc_modified_shock_index } from "../lib/medical/engine/calculators/shock_index";

describe("calc_shock_index", () => {
  it("computes HR/SBP and MSI", () => {
    const si = calc_shock_index({ hr_bpm: 120, sbp_mm_hg: 100 });
    expect(si).toBeCloseTo(1.2, 3);
    const msi = calc_modified_shock_index({ hr_bpm: 120, sbp_mm_hg: 100, dbp_mm_hg: 60 });
    const map = (100 + 2*60)/3;
    expect(msi).toBeCloseTo(120/map, 3);
  });
});
