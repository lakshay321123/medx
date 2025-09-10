
import { runMELD } from "../lib/medical/engine/calculators/meld";

test("MELD variants compute and are clamped 6–40", () => {
  const out = runMELD({ bilirubin_mg_dL: 3, creatinine_mg_dL: 2, inr: 1.8, sodium_mEq_L: 128, albumin_g_dL: 2.8, female: true, on_dialysis_in_last_week: false });
  expect(out.MELD_classic).toBeGreaterThanOrEqual(6);
  expect(out.MELD_classic).toBeLessThanOrEqual(40);
  expect(out.MELD_Na).toBeGreaterThanOrEqual(6);
  expect(out.MELD_3_0).toBeGreaterThanOrEqual(6);
} );
