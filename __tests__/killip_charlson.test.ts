
import { runKillipClass, runCharlson } from "../lib/medical/engine/calculators/cardio_tools";

test("Killip class logic", () => {
  expect(runKillipClass({}).class).toBe(1);
  expect(runKillipClass({ rales: true }).class).toBe(2);
  expect(runKillipClass({ pulmonary_edema: true }).class).toBe(3);
  expect(runKillipClass({ shock: true }).class).toBe(4);
});

test("Charlson age points accumulate", () => {
  const c = runCharlson({ age_years: 78, conditions: { chf: true, diabetes: true, any_tumor: true } });
  expect(c.score).toBeGreaterThan(3);
});
