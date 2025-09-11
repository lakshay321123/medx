// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_qsofa } from "../lib/medical/engine/calculators/qsofa";

describe("calc_qsofa", () => {
  it("adds criteria", () => {
    const v = calc_qsofa({ resp_rate: 24, sbp: 95, gcs: 14 });
    expect(v).toBe(3);
  });
});
