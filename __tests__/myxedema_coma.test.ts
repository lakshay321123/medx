import { runMyxedema } from "../lib/medical/engine/calculators/myxedema_coma";

test("Myxedema coma high score", () => {
  const out = runMyxedema({
    temp_c: 31,
    cns: "stupor",
    gi: "decreased_motility",
    precipitating_event: true,
    hr_bpm: 45,
    hypotension: true,
    pericardial_effusion: true,
    sodium_mEq_L: 125,
    glucose_mg_dL: 50,
    pao2_mmHg: 55,
    paco2_mmHg: 50,
    egfr_mL_min_1p73: 40,
  });
  expect(out.score).toBeGreaterThanOrEqual(100);
  expect(out.band).toMatch(/Highly suggestive/);
});
