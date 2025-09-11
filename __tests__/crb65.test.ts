// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_crb65 } from "../lib/medical/engine/calculators/crb65";

describe("calc_crb65", () => {
  it("scores correctly", () => {
    const v = calc_crb65({ confusion: false, resp_rate: 30, sbp: 95, dbp: 60, age_years: 70 });
    expect(v).toBe(3);
  });
});
