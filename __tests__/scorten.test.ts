import { test, expect } from "@jest/globals";
import { runSCORTEN } from "../lib/medical/engine/calculators/scorten";

test("SCORTEN", () => {
  const out = runSCORTEN({ age: 50, malignancy: true, hr: 130, tbsa_epidermal_detachment_pct: 20, bun_mmol_l: 12, bicarbonate_mmol_l: 15, glucose_mmol_l: 16 });
  expect(out.points).toBeGreaterThanOrEqual(5);
});
