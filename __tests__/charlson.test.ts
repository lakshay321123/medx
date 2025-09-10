import { runCharlson } from "../lib/medical/engine/calculators/charlson";

test("Charlson with age points", () => {
  const c = runCharlson({ age_years: 72, chf: true, diabetes: true, any_tumor: true });
  // base: CHF=1, DM=1, Tumor=2 => 4; age 70–79 => +3
  expect(c.cci_points).toBe(4);
  expect(c.age_points).toBe(3);
  expect(c.cci_total).toBe(7);
});
