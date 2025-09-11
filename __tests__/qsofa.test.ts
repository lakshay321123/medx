import { calc_qsofa } from "../lib/medical/engine/calculators/qsofa";

describe("calc_qsofa", () => {
  it("flags high risk at >=2", () => {
    const r = calc_qsofa({ rr: 30, sbp: 90, gcs: 15 });
    expect(r.score).toBeGreaterThanOrEqual(2);
    expect(r.high_risk).toBe(true);
  });
});
