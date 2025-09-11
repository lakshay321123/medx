// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_sirs } from "../lib/medical/engine/calculators/sirs";

describe("calc_sirs", () => {
  it("counts criteria", () => {
    const v = calc_sirs({ temp_c: 39, hr_bpm: 100, rr_per_min: 22, paco2_mm_hg: 30, wbc_k_per_uL: 14, bands_percent: 12 });
    expect(v).toBeGreaterThanOrEqual(3);
  });
});
