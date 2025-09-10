import { test, expect } from "@jest/globals";
import { runAPRI } from "../lib/medical/engine/calculators/apri";

test("APRI example", () => {
  const out = runAPRI({ ast_u_l:80, ast_uln_u_l:40, platelets_10e9_L:100 });
  expect(out.score).toBeCloseTo(2.0, 1);
  expect(out.band).toBe("suggests_cirrhosis");
});
