import { test, expect } from "@jest/globals";
import { checkSodiumCorrection } from "../lib/medical/engine/calculators/sodium_correction";

test("Sodium correction safety check", () => {
  const ok = checkSodiumCorrection({ start_na_mEq_L:110, target_na_mEq_L_24h:117, high_risk_osmotic_dem:true });
  expect(ok.within_safe_24h).toBe(true);
  const notOk = checkSodiumCorrection({ start_na_mEq_L:110, target_na_mEq_L_24h:120, high_risk_osmotic_dem:true });
  expect(notOk.within_safe_24h).toBe(false);
});
