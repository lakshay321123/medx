import { test, expect } from "@jest/globals";
import { runFourTs } from "../lib/medical/engine/calculators/hit_4ts";

test("4Ts high probability", () => {
  const out = runFourTs({ platelet_fall_pct:60, platelet_nadir_k:25, timing_days_since_heparin:6, new_thrombosis_or_skin_necrosis_or_acute_systemic_reaction:true, other_causes_of_thrombocytopenia_likely:"none" });
  expect(out.points).toBeGreaterThanOrEqual(6);
  expect(out.category).toBe("high");
});
