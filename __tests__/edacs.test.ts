import { runEDACS } from "../lib/medical/engine/calculators/edacs";

test("EDACS low vs not", () => {
  const low = runEDACS({ age_years: 38, male: false, diaphoresis: false, pain_radiation_to_arm_or_shoulder: false,
    pain_worsened_with_inspiration: true, pain_reproduced_by_palpation: true, known_risk_factors_count: 0 });
  expect(low.low_risk_candidate).toBe(true);

  const high = runEDACS({ age_years: 62, male: true, diaphoresis: true, pain_radiation_to_arm_or_shoulder: true,
    pain_worsened_with_inspiration: false, pain_reproduced_by_palpation: false, known_risk_factors_count: 4 });
  expect(high.edacs_points).toBeGreaterThanOrEqual(16);
});
