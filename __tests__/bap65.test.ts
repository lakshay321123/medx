
import { runBAP65 } from "../lib/medical/engine/calculators/bap65";

test("BAP-65 stratification", () => {
  const low = runBAP65({ bun_mg_dL: 10, altered_mental_status: false, pulse_bpm: 90, age_years: 50 });
  expect(low.score).toBe(0);
  const high = runBAP65({ bun_mg_dL: 30, altered_mental_status: true, pulse_bpm: 120, age_years: 80 });
  expect(high.score).toBeGreaterThanOrEqual(3);
});
