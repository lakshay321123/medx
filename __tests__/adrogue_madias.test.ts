import { test, expect } from "@jest/globals";
import { runAdrogueMadias } from "../lib/medical/engine/calculators/adrogue_madias";

test("Adrogue–Madias with 3% saline", () => {
  const out = runAdrogueMadias({ infusate_na_mEq_L:513, infusate_k_mEq_L:0, serum_na_mEq_L:115, total_body_water_L:35 });
  expect(out.delta_na_per_L).toBeGreaterThan(0);
});
