import { calc_fib4 } from "../lib/medical/engine/calculators/fib4";

describe("calc_fib4", () => {
  it("matches known example", () => {
    const v = calc_fib4({ age_years: 60, ast_u_l: 80, alt_u_l: 40, platelets_10e9_l: 200 });
    expect(v).toBeCloseTo(3.79, 2);
  });
});
