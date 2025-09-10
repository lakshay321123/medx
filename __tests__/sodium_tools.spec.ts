
import { runCorrectedNaHyperglycemia, runSodiumDeficitToTarget } from "../lib/medical/engine/calculators/sodium_tools";

test("Corrected Na & deficit", () => {
  const corr = runCorrectedNaHyperglycemia({ Na:120, glucose_mg_dL:560 })!;
  expect(corr.corrected_Na_mEq_L).toBeCloseTo(127.4, 1);
  const def = runSodiumDeficitToTarget({ weight_kg:70, Na:120, target_Na:135 })!;
  expect(def.sodium_deficit_mEq).toBeGreaterThan(0);
});
