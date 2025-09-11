import { calc_qsofa } from "../lib/medical/engine/calculators/qsofa";

describe("calc_qsofa", () => {
  it("scores 3 components", () => {
    const v = calc_qsofa({ sbp_mm_hg: 90, rr_bpm: 30, gcs_lt_15: false });
    expect(v).toBe(2);
  });
});
