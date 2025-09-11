// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_ldl_friedewald } from "../lib/medical/engine/calculators/ldl_friedewald";

describe("calc_ldl_friedewald", () => {
  it("computes LDL when TG < 400", () => {
    const v = calc_ldl_friedewald({ total_chol_mg_dl: 200, hdl_mg_dl: 50, triglycerides_mg_dl: 150 });
    expect(v).toBeCloseTo(200 - 50 - 30, 6);
  });
  it("returns NaN when TG >= 400", () => {
    const v = calc_ldl_friedewald({ total_chol_mg_dl: 200, hdl_mg_dl: 50, triglycerides_mg_dl: 450 });
    expect(Number.isNaN(v)).toBe(true);
  });
});
