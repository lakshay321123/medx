import { calc_sirs } from "../lib/medical/engine/calculators/sirs";

describe("calc_sirs", () => {
  it("meets SIRS when >=2", () => {
    const v = calc_sirs({ temp_c: 39, hr_bpm: 120, rr_bpm: 18, paco2_mm_hg: 40, wbc_k_per_uL: 7 });
    expect(v).toBe(2);
  });
});
