import { runAgeAdjustedDDimer } from "@/lib/medical/engine/calculators/age_adjusted_ddimer";

test("Age-adjusted D-dimer", () => {
  const young = runAgeAdjustedDDimer({ age:30 });
  expect(young.threshold_feu_ng_ml).toBe(500);
  const old = runAgeAdjustedDDimer({ age:70 });
  expect(old.threshold_feu_ng_ml).toBe(700);
});
