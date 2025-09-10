
import { abic } from "../lib/medical/engine/calculators/abic";

test("ABIC sample", () => {
  const out = abic({ age_years: 50, bilirubin_mg_dL: 10, inr: 2.0, creatinine_mg_dL: 1.5 });
  expect(out.score).toBeCloseTo(0.1*50 + 0.08*10 + 0.8*2 + 0.3*1.5, 2);
  expect(out.band === "intermediate" || out.band === "high" || out.band === "low").toBe(true);
});
