import { calc_qsofa } from "../lib/medical/engine/calculators/qsofa";

describe("calc_qsofa", () => {
  it("sums three binary criteria", () => {
    const v = calc_qsofa({ rr_ge_22: true, sbp_le_100: true, altered_mentation: false });
    expect(v).toBe(2);
  });
});
