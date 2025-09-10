import { test, expect } from "@jest/globals";
import { runParkland } from "../lib/medical/engine/calculators/parkland";

test("Parkland", () => {
  const out = runParkland({ weight_kg: 70, tbsa_percent: 20, hours_since_burn: 4 });
  expect(out.total_ml_24h).toBe(4*70*20);
  expect(out.first8h_ml).toBeCloseTo(out.next16h_ml, 1);
  expect(out.remaining_first8h_ml).toBeCloseTo(out.first8h_ml/2,1);
});
