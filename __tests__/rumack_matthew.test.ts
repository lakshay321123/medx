
import { test, expect } from "@jest/globals";
import { runRumackMatthew } from "../lib/medical/engine/calculators/rumack_matthew";

test("Rumack–Matthew: 8h 100 µg/mL is above 75 threshold", () => {
  const out = runRumackMatthew({ hours_since_ingestion: 8, acetaminophen_level_ug_mL: 100 });
  expect(out.interpretable).toBe(true);
  expect(out.threshold_ug_mL).toBeGreaterThan(70);
  expect(out.above_treatment_line).toBe(true);
});
