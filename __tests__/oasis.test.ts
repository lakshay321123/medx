
import { runOASIS } from "../lib/medical/engine/calculators/oasis";

test("OASIS points compute", () => {
  const s = runOASIS({
    age_years: 72, gcs: 13, heart_rate_bpm: 120, map_mmHg: 55, respiratory_rate: 26, temperature_C: 36.0,
    urine_output_mL_day: 800, mech_vent: true, elective_surgery: false, preicu_los_days: 2.0, icu_type: "MICU"
  });
  expect(s.OASIS_points).toBeGreaterThan(0);
});
