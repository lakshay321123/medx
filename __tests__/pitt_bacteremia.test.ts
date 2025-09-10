
import { test, expect } from "@jest/globals";
import { runPittBacteremia } from "../lib/medical/engine/calculators/pitt_bacteremia";

test("Pitt bacteremia score high", () => {
  const out = runPittBacteremia({ temp_c:34.5, sbp_mmHg:80, mechanical_ventilation:true, cardiac_arrest:false, mental_status:"stupor" });
  expect(out.points).toBe(1 + 2 + 2 + 0 + 2);
});
