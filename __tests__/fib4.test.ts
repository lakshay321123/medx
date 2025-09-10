import { test, expect } from "@jest/globals";
import { runFIB4 } from "../lib/medical/engine/calculators/fib4";

test("FIB-4 example", () => {
  const out = runFIB4({ age_years:60, ast_u_l:80, alt_u_l:50, platelets_10e9_L:120 });
  expect(out.score).toBeGreaterThan(2);
  expect(["indeterminate","high","low"]).toContain(out.band);
});
