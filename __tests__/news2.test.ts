// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_news2 } from "../lib/medical/engine/calculators/news2";

describe("calc_news2", () => {
  it("computes risk banding", () => {
    const r = calc_news2({ rr: 28, spo2_percent: 90, on_supplemental_o2: true, temp_c: 39.2, sbp: 88, hr: 140, consciousness: "vpu" });
    expect(r.score).toBeGreaterThanOrEqual(7);
    expect(r.risk).toBe("high");
  });
});
