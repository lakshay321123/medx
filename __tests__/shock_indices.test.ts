import { runShockIndices } from "../lib/medical/engine/calculators/shock_indices";

test("Shock indices basic", () => {
  const out = runShockIndices({ hr_bpm: 110, sbp_mmHg: 100, dbp_mmHg: 60, age_years: 70 });
  expect(out.shock_index).toBeGreaterThan(0);
  expect(out.bands.shock_index).toBeDefined();
});
