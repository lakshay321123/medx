import { runAAGradient } from "../lib/medical/engine/calculators/oxygenation_tools";

test("A–a gradient basic", () => {
  const out = runAAGradient({ fio2_frac: 0.21, pao2_mmHg: 80, paco2_mmHg: 40, age_years: 60 });
  expect(out.AAg).toBeGreaterThanOrEqual(0);
});
