// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_curb65 } from "../lib/medical/engine/calculators/curb65";

describe("calc_curb65", () => {
  it("scores correctly", () => {
    const v = calc_curb65({ confusion: true, urea_mmol_l: 10, resp_rate: 32, sbp: 88, dbp: 55, age_years: 70 });
    expect(v).toBe(5);
  });
});
