import { calc_qsofa } from "../lib/medical/engine/calculators/qsofa";

describe("calc_qsofa", () => {
  it("scores 3 when all criteria met", () => {
    const v = calc_qsofa({ rr_per_min: 30, sbp_mm_hg: 90, gcs_total: 10 });
    expect(v).toBe(3);
  });
});
