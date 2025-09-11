import { calc_sirs } from "../lib/medical/engine/calculators/sirs";

describe("calc_sirs", () => {
  it("meets 4 criteria when all abnormal", () => {
    const v = calc_sirs({ temp_c: 39, hr_bpm: 120, rr_bpm: 24, paco2_mm_hg: 30, wbc_10e9_l: 15, bands_percent: 12 });
    expect(v).toBe(4);
  });
});
