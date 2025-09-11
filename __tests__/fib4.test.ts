// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_fib4 } from "../lib/medical/engine/calculators/fib4";

describe("calc_fib4", () => {
  it("computes FIB-4", () => {
    const v = calc_fib4({ age_years: 50, ast_u_l: 60, alt_u_l: 30, platelets_10e9_l: 200 });
    expect(v).toBeCloseTo((50*60)/(200*Math.sqrt(30)), 6);
  });
});
