import { runEDACS } from "../lib/medical/engine/calculators/edacs";

test("EDACS basic scoring and cutoff", () => {
  const out = runEDACS({
    age_years: 62,
    male: true,
    known_cad_or_ge3_riskf: false,
    diaphoresis: true,
    radiation_to_arm_or_shoulder: true,
    pain_described_as_pressure: true,
    pain_worse_with_inspiration: false,
    pain_reproducible_by_palpation: false,
  });
  // Age 62=10, male 6, diaphoresis 3, radiation 5, pressure 3 => 27
  expect(out.score).toBe(27);
  expect(out.lowRiskCutoff16).toBe(false);
});
